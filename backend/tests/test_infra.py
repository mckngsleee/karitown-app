"""Checks the AWS setup without deploying anything (no AWS account or Docker needed)."""
import aws_cdk as cdk
import pytest
from aws_cdk.assertions import Match, Template

from infra.stack import KaritownStack


@pytest.fixture(scope="module")
def template():
    # Skip packaging the Lambda code (that needs Docker); we only check the AWS resources.
    app = cdk.App(context={"aws:cdk:bundling-stacks": []})
    return Template.from_stack(KaritownStack(app, "Test"))


def test_table_uses_kind_and_id_and_on_demand_billing(template):
    template.has_resource_properties("AWS::DynamoDB::Table", {
        "KeySchema": [{"AttributeName": "kind", "KeyType": "HASH"}, {"AttributeName": "id", "KeyType": "RANGE"}],
        "BillingMode": "PAY_PER_REQUEST",
    })


def test_function_runs_the_fastapi_handler(template):
    template.has_resource_properties("AWS::Lambda::Function", {
        "Handler": "app.main.handler",
        "Runtime": "python3.12",
        "Environment": {"Variables": {"TABLE_NAME": Match.any_value(), "API_KEY": Match.any_value()}},
    })


def test_api_gateway_sends_requests_to_the_function(template):
    template.resource_count_is("AWS::ApiGatewayV2::Api", 1)
    template.has_resource_properties("AWS::ApiGatewayV2::Integration", {"IntegrationType": "AWS_PROXY"})


def test_api_key_is_a_hidden_parameter(template):
    template.has_parameter("ApiKey", {"NoEcho": True})
