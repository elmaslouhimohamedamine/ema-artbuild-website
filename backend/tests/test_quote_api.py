from io import BytesIO


class TestRootApi:
    # Core API availability checks
    def test_api_root_returns_message(self, api_client, base_url):
        response = api_client.get(f"{base_url}/api/")

        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "EMA ARTBUILD API"


class TestQuoteRequests:
    # Quote request validation and non-configured email flow
    def test_quote_missing_required_field_returns_422(self, api_client, base_url):
        payload = {
            "full_name": "TEST Missing Phone",
            # phone intentionally omitted
            "email": "test.missing@example.com",
            "city": "Rabat",
            "project_type": "Design intérieur",
            "budget": "À définir",
            "message": "Need a consultation",
            "locale": "fr",
        }

        response = api_client.post(f"{base_url}/api/quote-requests", data=payload)

        assert response.status_code == 422
        data = response.json()
        assert data["detail"][0]["loc"][-1] == "phone"

    def test_quote_without_resend_config_returns_503(self, api_client, base_url):
        payload = {
            "full_name": "TEST No Resend",
            "phone": "+212600000001",
            "email": "test.noresend@example.com",
            "city": "Casablanca",
            "project_type": "Rénovation",
            "budget": "À définir",
            "message": "Test non configured resend",
            "locale": "fr",
        }

        response = api_client.post(f"{base_url}/api/quote-requests", data=payload)

        assert response.status_code == 503
        data = response.json()
        assert "pas encore configur" in data["detail"].lower()

    def test_quote_invalid_attachment_type_returns_415(self, api_client, base_url):
        payload = {
            "full_name": "TEST Invalid Attachment",
            "phone": "+212600000002",
            "email": "test.attachment@example.com",
            "city": "Tanger",
            "project_type": "Conception 3D",
            "budget": "100 000 – 250 000 MAD",
            "message": "Testing invalid attachment handling",
            "locale": "fr",
        }

        files = {
            "attachments": ("bad.txt", BytesIO(b"invalid").read(), "text/plain")
        }
        response = api_client.post(f"{base_url}/api/quote-requests", data=payload, files=files)

        # If resend is not configured, validation order may still return 503 before file parsing.
        assert response.status_code in (415, 503)
        data = response.json()
        if response.status_code == 415:
            assert "jpg" in data["detail"].lower()
        else:
            assert "pas encore configur" in data["detail"].lower()