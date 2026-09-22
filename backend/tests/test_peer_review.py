import unittest
import sys
import os

# Add backend to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.peer_review import (
    NoAiSlopAuditor,
    FactCheckerAgent,
    PeerReviewCoordinator,
    PeerReviewReport,
    PeerReviewFinding
)
from app.core.agent_writer import (
    generate_reviewed_festival_description,
    generate_organic_festival_description,
    generate_reviewed_borgo_cultural_info,
    generate_borgo_cultural_info
)


class TestPeerReviewAndFactChecking(unittest.TestCase):
    """Suite di test per il sistema Multi-Agente di Peer Review e Fact Checking."""

    def test_no_ai_slop_auditor_detects_banned_terms(self):
        """Verifica che NoAiSlopAuditor rilevi e rimuova i cliché e le parole bandite da no-ai-slop."""
        slop_text = (
            "La Sagra del Tartufo è il fiore all'occhiello dell'Umbria. "
            "Nella splendida cornice del borgo, un vero e proprio connubio perfetto di sapori. "
            "Un viaggio tra sapori d'altri tempi dove il tempo sembra essersi fermato."
        )

        findings, cleaned = NoAiSlopAuditor.audit_text(slop_text)
        
        # Ci devono essere findings per ogni termine vietato
        self.assertTrue(any(f.category == "SLOP_LANGUAGE" for f in findings))
        matched = [f.matched_text.lower() for f in findings if f.matched_text]
        self.assertTrue(any("fiore all'occhiello" in m for m in matched))
        self.assertTrue(any("splendida cornice" in m for m in matched))
        self.assertTrue(any("un vero e proprio" in m for m in matched))

        # Il testo pulito non deve contenere "fiore all'occhiello"
        self.assertNotIn("fiore all'occhiello", cleaned.lower())
        self.assertNotIn("splendida cornice", cleaned.lower())

    def test_no_ai_slop_preserves_clean_factual_text(self):
        """Verifica che un testo asciutto, concreto e fattuale non subisca alterazioni e riceva 0 violazioni."""
        clean_text = (
            "La Sagra della Cipolla si svolge a Cannara dal 1 al 10 settembre 2026. "
            "Gli stand propongono la cipolla di Cannara cotta al forno, penne alla cannarina "
            "e piatti tradizionali della cucina umbra."
        )

        findings, cleaned = NoAiSlopAuditor.audit_text(clean_text)
        errors = [f for f in findings if f.severity == "ERROR"]
        self.assertEqual(len(errors), 0)
        self.assertEqual(clean_text.strip(), cleaned.strip())

    def test_fact_checker_detects_invalid_geography(self):
        """Verifica che FactCheckerAgent segnali province o coordinate fuori dai confini dell'Umbria."""
        # Provincia non umbra
        findings = FactCheckerAgent.verify_geography(city="Milano", province="MI", latitude=45.4642, longitude=9.1900)
        self.assertTrue(any("MI" in f.description for f in findings))
        self.assertTrue(any("fuori dai confini" in f.description for f in findings))

        # Provincia e coordinate umbre valide
        valid_findings = FactCheckerAgent.verify_geography(city="Gubbio", province="PG", latitude=43.3516, longitude=12.5786)
        self.assertEqual(len(valid_findings), 0)

    def test_fact_checker_detects_incoherent_claims(self):
        """Verifica che asserzioni incoerenti con l'Umbria (es. mare, costa) siano scartate come unverified claims."""
        hallucinated_text = (
            "La festa propone ottimi piatti di pesce fresco appena pescato sul mare "
            "lungo la spiaggia della costa tirrenica umbra."
        )

        findings, verified, unverified = FactCheckerAgent.verify_claims(
            text=hallucinated_text,
            city="Foligno",
            province="PG",
            dish_info="Pesce di lago"
        )

        self.assertTrue(any("mare" in u.lower() or "spiaggia" in u.lower() or "costa" in u.lower() for u in unverified))

    def test_peer_review_coordinator_event_description(self):
        """Verifica che il PeerReviewCoordinator esegua il ciclo completo di review e revisione."""
        draft_with_slop = (
            "Festa del Vino a Montefalco. È il fiore all'occhiello dei colli umbri, "
            "un vero e proprio viaggio tra sapori nella splendida cornice dei vigneti."
        )

        report = PeerReviewCoordinator.review_event_description(
            draft_text=draft_with_slop,
            name="Festa del Vino",
            city="Montefalco",
            province="PG",
            dish_info="Sagrantino DOCG e strangozzi al tartufo",
            menu_info="Degustazioni guidate e piatti tipici"
        )

        self.assertIsInstance(report, PeerReviewReport)
        self.assertIn(report.status, ["APPROVED", "REVISED"])
        self.assertGreaterEqual(report.quality_score, 80)
        self.assertTrue(len(report.verified_facts) > 0)
        # Il testo finale non deve contenere espressioni vietate
        self.assertNotIn("fiore all'occhiello", report.final_text.lower())
        self.assertNotIn("splendida cornice", report.final_text.lower())
        self.assertIn("Montefalco", report.final_text)

    def test_peer_review_cultural_info_generation(self):
        """Verifica la generazione e peer review di informazioni culturali per un borgo umbro."""
        cultural_text, report = generate_reviewed_borgo_cultural_info(
            city="Spello",
            province="PG",
            name="Incontri d'Autunno"
        )

        self.assertTrue(len(cultural_text) > 40)
        self.assertIn("Spello", cultural_text)
        self.assertIn("Umbria", cultural_text)
        self.assertIsInstance(report, PeerReviewReport)
        self.assertGreaterEqual(report.quality_score, 80)

    def test_zero_unverified_claims_fallback(self):
        """Verifica che testi con gravi allucinazioni vengano sostituiti da fallback fattuale 100% verificato."""
        heavily_hallucinated_draft = (
            "La sagra si tiene sul porto marittimo con vista sulla spiaggia delle alpi, "
            "delve into the game changer tapestry of modern times."
        )

        report = PeerReviewCoordinator.review_event_description(
            draft_text=heavily_hallucinated_draft,
            name="Sagra della Porchetta",
            city="Costano",
            province="PG",
            dish_info="Porchetta umbra cotta a legna",
            program_info="Musica da ballo ogni sera"
        )

        # Deve essere stato revisionato e sanitizzato
        self.assertEqual(report.status, "REVISED")
        self.assertNotIn("porto", report.final_text.lower())
        self.assertNotIn("spiaggia", report.final_text.lower())
        self.assertNotIn("tapestry", report.final_text.lower())
        self.assertIn("Costano", report.final_text)
        self.assertIn("Porchetta", report.final_text)


if __name__ == '__main__':
    unittest.main()
