"""Small runtime compatibility shim for repository document-build scripts.

python-docx's bundled template names its default table style ``Table Normal``.
Some Word templates expose the same built-in style as ``Table``. Treat those
names as aliases so document generation remains portable across environments.
"""

try:
    from docx.styles.styles import Styles
except ImportError:  # Document dependencies are optional outside build jobs.
    Styles = None

if Styles is not None and not getattr(Styles, "_gauntlet_table_alias", False):
    _original_getitem = Styles.__getitem__

    def _gauntlet_getitem(self, key):
        try:
            return _original_getitem(self, key)
        except KeyError:
            if key == "Table":
                return _original_getitem(self, "Table Normal")
            raise

    Styles.__getitem__ = _gauntlet_getitem
    Styles._gauntlet_table_alias = True