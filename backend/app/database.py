"""Saving and reading records in DynamoDB.

We use ONE table. Every item has two keys:
    kind -> what sort of record it is: "material", "purchase", "load", ...
    id   -> the record's own id

So "all purchases" is simply: query where kind = "purchase".

Run `python -m app.database` to create the table when using DynamoDB Local on your computer.
"""
import os
from decimal import Decimal

import boto3
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

TABLE_NAME = os.environ.get("TABLE_NAME", "karitown")


def get_table():
    # DYNAMODB_ENDPOINT is only set when testing on your own computer (DynamoDB Local).
    dynamodb = boto3.resource("dynamodb", endpoint_url=os.environ.get("DYNAMODB_ENDPOINT"))
    return dynamodb.Table(TABLE_NAME)


def to_plain(value):
    """DynamoDB gives numbers back as Decimal. Turn them back into int."""
    if isinstance(value, Decimal):
        return int(value)
    if isinstance(value, list):
        return [to_plain(v) for v in value]
    if isinstance(value, dict):
        return {k: to_plain(v) for k, v in value.items()}
    return value


def get(kind, id):
    response = get_table().get_item(Key={"kind": kind, "id": id})
    item = response.get("Item")
    return to_plain(item) if item else None


def list_all(kind):
    table = get_table()
    items = []
    response = table.query(KeyConditionExpression=Key("kind").eq(kind))
    items.extend(response["Items"])
    while "LastEvaluatedKey" in response:     # DynamoDB returns big results in pages
        response = table.query(KeyConditionExpression=Key("kind").eq(kind),
                               ExclusiveStartKey=response["LastEvaluatedKey"])
        items.extend(response["Items"])
    return [to_plain(i) for i in items]


def save(kind, item):
    """Create or replace a record."""
    get_table().put_item(Item={**item, "kind": kind})


def save_new(kind, item):
    """Create a record only if its id is new. Returns False if it already exists.

    This is what makes offline sync safe: if the phone sends the same purchase
    twice (weak signal, retry), the second one is ignored.
    """
    try:
        get_table().put_item(Item={**item, "kind": kind}, ConditionExpression="attribute_not_exists(id)")
        return True
    except ClientError as error:
        if error.response["Error"]["Code"] == "ConditionalCheckFailedException":
            return False
        raise


def next_number(prefix):
    """Receipt numbers that count up: PUR-0001, PUR-0002, ... (one counter per prefix)."""
    response = get_table().update_item(
        Key={"kind": "counter", "id": prefix},
        UpdateExpression="ADD #n :one",
        ExpressionAttributeNames={"#n": "value"},
        ExpressionAttributeValues={":one": 1},
        ReturnValues="UPDATED_NEW",
    )
    return f"{prefix}-{int(response['Attributes']['value']):04d}"


def create_table():
    """Create the table (the AWS template does this for you in the cloud)."""
    dynamodb = boto3.resource("dynamodb", endpoint_url=os.environ.get("DYNAMODB_ENDPOINT"))
    dynamodb.create_table(
        TableName=TABLE_NAME,
        KeySchema=[{"AttributeName": "kind", "KeyType": "HASH"}, {"AttributeName": "id", "KeyType": "RANGE"}],
        AttributeDefinitions=[{"AttributeName": "kind", "AttributeType": "S"},
                              {"AttributeName": "id", "AttributeType": "S"}],
        BillingMode="PAY_PER_REQUEST",
    )


if __name__ == "__main__":
    create_table()
    print(f"Created table {TABLE_NAME}")
