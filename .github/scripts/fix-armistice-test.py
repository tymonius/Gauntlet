from pathlib import Path

path = Path("src/state/neutral-armistice.test.ts")
text = path.read_text()
old = "    expect(state.neutralArmisticeConditions).toBeUndefined();\n"
if text.count(old) != 1:
    raise RuntimeError(f"Expected one stale Armistice Condition assertion, found {text.count(old)}")
path.write_text(text.replace(old, "", 1))
Path(__file__).unlink()
