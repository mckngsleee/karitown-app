"""Test setup: a fake DynamoDB (moto) so tests never touch AWS or cost money."""
import os

import pytest
from fastapi.testclient import TestClient
from moto import mock_aws

os.environ.setdefault("AWS_DEFAULT_REGION", "ap-southeast-1")
os.environ.setdefault("AWS_ACCESS_KEY_ID", "testing")
os.environ.setdefault("AWS_SECRET_ACCESS_KEY", "testing")
os.environ.pop("DYNAMODB_ENDPOINT", None)
os.environ.pop("API_KEY", None)


@pytest.fixture
def client():
    with mock_aws():
        from app import database
        from app.demo_data import load_demo_data
        from app.main import app

        database.create_table()
        load_demo_data()
        yield TestClient(app)
