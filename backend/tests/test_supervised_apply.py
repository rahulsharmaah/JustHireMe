import unittest
from unittest import mock

try:
    from .test_api import post
except ImportError:
    from test_api import post


VALID_ASSET = __file__


def _lead(**overrides):
    lead = {
        "job_id": "apply-001",
        "title": "AI Engineer",
        "company": "Acme",
        "url": "https://example.com/apply",
        "status": "approved",
        "cover_letter_asset": VALID_ASSET,
    }
    lead.update(overrides)
    return lead


def _patch_apply_context(lead=None, asset=VALID_ASSET):
    return (
        mock.patch("db.client.get_lead_for_fire", return_value=(lead or _lead(), asset)),
        mock.patch("db.client.get_profile", return_value={"candidate": {"n": "Candidate"}}),
        mock.patch(
            "db.client.get_settings",
            return_value={
                "full_name": "Candidate",
                "email": "candidate@example.com",
                "phone": "+15555550100",
                "linkedin_url": "https://linkedin.com/in/candidate",
                "github_url": "https://github.com/candidate",
                "website_url": "https://candidate.example",
                "city": "San Francisco",
                "current_company": "Independent",
            },
        ),
    )


class TestSupervisedApplyFlow(unittest.TestCase):
    def test_preview_reports_blockers_and_requires_review_for_sensitive_or_blank_fields(self):
        form_result = {
            "fields": [
                {"label": "Email", "answer": "candidate@example.com", "found_on_page": True},
                {"label": "Expected salary", "answer": "", "found_on_page": True},
            ],
            "unmatched_labels": ["Will you require visa sponsorship?"],
        }

        async def _read_form(*_args, **_kwargs):
            return form_result

        context_patches = _patch_apply_context()
        with (
            context_patches[0],
            context_patches[1],
            context_patches[2],
            mock.patch("agents.actuator.read_form", side_effect=_read_form) as read_form,
            mock.patch("db.client.record_event") as record_event,
        ):
            resp = post("/api/v1/leads/apply-001/apply/preview")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["stage"], "preview")
        self.assertEqual(data["job_id"], "apply-001")
        self.assertTrue(data["requires_user_review"])
        self.assertFalse(data["can_submit"])
        self.assertIn("Expected salary", data["missing_answers"])
        self.assertIn("Will you require visa sponsorship?", data["sensitive_labels"])
        read_form.assert_called_once()
        record_event.assert_called_once_with("apply-001", "apply_preview")

    def test_fill_runs_actuator_without_final_submit(self):
        context_patches = _patch_apply_context()
        with (
            context_patches[0],
            context_patches[1],
            context_patches[2],
            mock.patch(
                "agents.actuator.run",
                return_value={
                    "status": "read_only",
                    "fields_filled": ["email"],
                    "resume_uploaded": True,
                    "ready_to_submit": True,
                },
            ) as actuator_run,
            mock.patch("db.client.record_event") as record_event,
        ):
            resp = post("/api/v1/leads/apply-001/apply/fill")

        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["stage"], "fill")
        self.assertFalse(data["submitted"])
        self.assertEqual(data["fields_filled"], ["email"])
        actuator_run.assert_called_once()
        self.assertEqual(actuator_run.call_args.args[2:], (False, False))
        record_event.assert_called_once_with("apply-001", "apply_fill")

    def test_apply_routes_use_fire_blocker_before_browser_work(self):
        blocked_lead = _lead(cover_letter_asset="")

        routes = [
            ("/api/v1/leads/apply-001/apply/preview", None),
            ("/api/v1/leads/apply-001/apply/fill", None),
            ("/api/v1/leads/apply-001/apply/submit", {"confirm": True}),
        ]

        for path, body in routes:
            with self.subTest(path=path):
                context_patches = _patch_apply_context(lead=blocked_lead)
                with (
                    context_patches[0],
                    context_patches[1],
                    context_patches[2],
                    mock.patch("db.client.get_setting", return_value="true"),
                    mock.patch("agents.actuator.read_form") as read_form,
                    mock.patch("agents.actuator.run") as actuator_run,
                ):
                    resp = post(path, json=body)

                self.assertEqual(resp.status_code, 409)
                self.assertIn("cover letter", resp.json()["detail"].lower())
                read_form.assert_not_called()
                actuator_run.assert_not_called()

    def test_submit_requires_explicit_confirmation_body(self):
        with mock.patch("agents.actuator.run") as actuator_run:
            resp = post("/api/v1/leads/apply-001/apply/submit", json={})

        self.assertEqual(resp.status_code, 400)
        self.assertIn("confirm", resp.json()["detail"])
        actuator_run.assert_not_called()

    def test_submit_rejects_unexpected_body_fields(self):
        resp = post(
            "/api/v1/leads/apply-001/apply/submit",
            json={"confirm": True, "ready": True},
        )

        self.assertEqual(resp.status_code, 422)

    def test_submit_requires_auto_apply_setting_after_confirmation(self):
        with (
            mock.patch("db.client.get_setting", return_value="false"),
            mock.patch("db.client.get_lead_for_fire") as get_lead_for_fire,
            mock.patch("agents.actuator.run") as actuator_run,
        ):
            resp = post(
                "/api/v1/leads/apply-001/apply/submit",
                json={"confirm": True},
            )

        self.assertEqual(resp.status_code, 409)
        self.assertIn("Experimental Auto Apply", resp.json()["detail"])
        get_lead_for_fire.assert_not_called()
        actuator_run.assert_not_called()

    def test_submit_marks_applied_only_after_confirmed_successful_actuator_run(self):
        context_patches = _patch_apply_context()
        with (
            mock.patch("db.client.get_setting", return_value="true"),
            context_patches[0],
            context_patches[1],
            context_patches[2],
            mock.patch("agents.actuator.run", return_value=True) as actuator_run,
            mock.patch("db.client.mark_applied") as mark_applied,
        ):
            resp = post(
                "/api/v1/leads/apply-001/apply/submit",
                json={"confirm": True},
            )

        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["stage"], "submit")
        self.assertTrue(resp.json()["submitted"])
        actuator_run.assert_called_once()
        self.assertEqual(actuator_run.call_args.args[2:], (False, True))
        mark_applied.assert_called_once_with("apply-001")


if __name__ == "__main__":
    unittest.main()
