"""The AWS setup for Karitown, written with AWS CDK (Python).

`cdk deploy` turns this class into a CloudFormation stack with:
    DynamoDB table  ->  data
    Lambda function ->  runs the FastAPI app in app/
    HTTP API        ->  the public URL (API Gateway) in front of the function
    Log group       ->  keeps the function's logs for 14 days
"""
from pathlib import Path

from aws_cdk import CfnOutput, CfnParameter, Duration, RemovalPolicy, Stack
from aws_cdk import aws_apigatewayv2 as apigw
from aws_cdk import aws_apigatewayv2_integrations as integrations
from aws_cdk import aws_dynamodb as dynamodb
from aws_cdk import aws_lambda as lambda_
from aws_cdk import aws_logs as logs
from constructs import Construct

PROJECT_ROOT = Path(__file__).resolve().parent.parent   # the folder with app/ and requirements.txt


class KaritownStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # Secret the phone app sends in the x-api-key header. Given at deploy time:
        #   cdk deploy --parameters ApiKey=some-long-random-text
        api_key = CfnParameter(self, "ApiKey", no_echo=True, min_length=12,
                               description="Secret sent in the x-api-key header")

        # ----- Data tier: one DynamoDB table, pay only for what you use -----
        table = dynamodb.Table(
            self, "KaritownTable",
            partition_key=dynamodb.Attribute(name="kind", type=dynamodb.AttributeType.STRING),
            sort_key=dynamodb.Attribute(name="id", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True),
            removal_policy=RemovalPolicy.DESTROY,   # `cdk destroy` deletes the data too (fine for a demo)
        )

        # ----- Application tier: the FastAPI app on Lambda -----
        # Packaging: CDK starts a Docker container that looks like Lambda, installs requirements.txt,
        # and copies the app/ folder next to the libraries. That way the libraries match Lambda's Linux.
        code = lambda_.Code.from_asset(
            str(PROJECT_ROOT),
            exclude=[".venv", ".git", "cdk.out", "tests", "infra", "**/__pycache__"],
            bundling={
                "image": lambda_.Runtime.PYTHON_3_12.bundling_image,
                "command": ["bash", "-c",
                            "pip install -r requirements.txt -t /asset-output && cp -r app /asset-output"],
            },
        )
        function = lambda_.Function(
            self, "KaritownFunction",
            runtime=lambda_.Runtime.PYTHON_3_12,
            handler="app.main.handler",
            code=code,
            memory_size=512,
            timeout=Duration.seconds(15),
            environment={"TABLE_NAME": table.table_name, "API_KEY": api_key.value_as_string},
            log_group=logs.LogGroup(self, "KaritownLogs", retention=logs.RetentionDays.TWO_WEEKS,
                                    removal_policy=RemovalPolicy.DESTROY),
        )
        table.grant_read_write_data(function)       # this one table only, nothing else

        # ----- The public URL: API Gateway HTTP API sends every request to the function -----
        http_api = apigw.HttpApi(
            self, "KaritownApi",
            default_integration=integrations.HttpLambdaIntegration("LambdaIntegration", function),
        )

        CfnOutput(self, "ApiUrl", value=http_api.api_endpoint,
                  description="Base URL of the API (add /docs to see every endpoint)")
        CfnOutput(self, "TableName", value=table.table_name)
