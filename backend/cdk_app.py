"""CDK entry point (cdk.json runs this file).

    cdk deploy --parameters ApiKey=some-long-random-text
    cdk destroy
"""
import os

import aws_cdk as cdk

from infra.stack import KaritownStack

app = cdk.App()
KaritownStack(
    app, "Karitown",
    env=cdk.Environment(account=os.environ.get("CDK_DEFAULT_ACCOUNT"),
                        region=os.environ.get("CDK_DEFAULT_REGION", "ap-southeast-1")),  # Singapore
)
app.synth()
