from pathlib import Path

path = Path("src/state/neutral-decoys.ts")
text = path.read_text()
old = "  const sources = exitedActiveCopies.map((exit, index) => ({\n"
new = "  const sources: DecoysSourceLocation[] = exitedActiveCopies.map((exit, index) => ({\n"
if text.count(old) != 1:
    raise RuntimeError(f"Expected one Decoys source inference site, found {text.count(old)}")
path.write_text(text.replace(old, new, 1))
Path(__file__).unlink()
