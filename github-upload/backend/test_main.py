from main import analyze_text, detect_skills


def test_exact_skill_detection():
    assert "Java" not in detect_skills("JavaScript and React")
    assert "C++" in detect_skills("C++ experience")
    assert "SQL" not in detect_skills("NoSQL")


def test_match_score():
    result = analyze_text("Python SQL Git projects and education are documented.", "We require Python SQL Git Docker for the role.")
    assert result["match_score"] == 75
    assert result["missing_skills"] == ["Docker"]


def test_no_unearned_skills():
    result = analyze_text("Python experience with data projects in university.", "Python, Docker and AWS skills required for this job.")
    assert "AWS" not in result["matched_skills"]
    assert "Docker" in result["missing_skills"]
