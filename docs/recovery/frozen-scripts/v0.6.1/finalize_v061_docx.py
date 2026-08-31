#!/usr/bin/env python3
"""Finalize the generated v0.6.1 Rulebook DOCX before PDF conversion.

Pandoc writes its DOCX table of contents as a dirty Word field. Headless
LibreOffice does not update that field before PDF conversion, producing an empty
contents section. This postprocessor replaces the field with a static linked
list built from the Rulebook's introductory and numbered section headings and
removes the redundant Markdown title block already represented by the DOCX
cover metadata.
"""

from __future__ import annotations

import argparse
import re
import tempfile
import zipfile
from pathlib import Path

from lxml import etree

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
NS = {"w": W_NS}
DOCUMENT_XML = "word/document.xml"

INTRODUCTORY_HEADINGS = {"Welcome to Gauntlet", "Rules Conventions"}
NUMBERED_SECTION = re.compile(r"^\d+\.\s+")


def qn(local: str) -> str:
    return f"{{{W_NS}}}{local}"


def paragraph_text(element: etree._Element) -> str:
    return "".join(element.xpath(".//w:t/text()", namespaces=NS)).strip()


def paragraph_style(element: etree._Element) -> str:
    values = element.xpath("./w:pPr/w:pStyle/@w:val", namespaces=NS)
    return values[0] if values else ""


def nearest_bookmark(children: list[etree._Element], index: int) -> str | None:
    for previous in reversed(children[:index]):
        if previous.tag == qn("p"):
            break
        if previous.tag == qn("bookmarkStart"):
            name = previous.get(qn("name"), "")
            if name and not name.startswith("_"):
                return name
    return None


def make_paragraph(text: str, style: str, anchor: str | None = None) -> etree._Element:
    paragraph = etree.Element(qn("p"))
    properties = etree.SubElement(paragraph, qn("pPr"))
    style_node = etree.SubElement(properties, qn("pStyle"))
    style_node.set(qn("val"), style)

    parent = paragraph
    if anchor:
        hyperlink = etree.SubElement(paragraph, qn("hyperlink"))
        hyperlink.set(qn("anchor"), anchor)
        hyperlink.set(qn("history"), "1")
        parent = hyperlink

    run = etree.SubElement(parent, qn("r"))
    text_node = etree.SubElement(run, qn("t"))
    text_node.text = text
    return paragraph


def page_break_paragraph() -> etree._Element:
    paragraph = etree.Element(qn("p"))
    run = etree.SubElement(paragraph, qn("r"))
    break_node = etree.SubElement(run, qn("br"))
    break_node.set(qn("type"), "page")
    return paragraph


def is_contents_heading(style: str, text: str) -> bool:
    if style not in {"Heading1", "Heading2"}:
        return False
    return text in INTRODUCTORY_HEADINGS or bool(NUMBERED_SECTION.match(text))


def replace_toc(body: etree._Element) -> None:
    children = list(body)
    toc = next(
        (
            child
            for child in children
            if child.tag == qn("sdt")
            and child.xpath(
                ".//w:docPartGallery[@w:val='Table of Contents']",
                namespaces=NS,
            )
        ),
        None,
    )
    if toc is None:
        raise RuntimeError("Generated DOCX does not contain a Pandoc table-of-contents field")

    headings: list[tuple[str, str | None]] = []
    for index, child in enumerate(children):
        if child.tag != qn("p"):
            continue
        text = paragraph_text(child)
        style = paragraph_style(child)
        if not text or not is_contents_heading(style, text):
            continue
        headings.append((text, nearest_bookmark(children, index)))

    if len(headings) < 17:
        raise RuntimeError(
            f"Only {len(headings)} Rulebook section headings were found for the contents page"
        )

    content = toc.find("w:sdtContent", namespaces=NS)
    if content is None:
        raise RuntimeError("Generated DOCX table of contents has no content container")
    for child in list(content):
        content.remove(child)

    content.append(make_paragraph("Table of Contents", "TOCHeading"))
    for text, anchor in headings:
        content.append(make_paragraph(text, "TOC1", anchor))
    content.append(page_break_paragraph())


def remove_duplicate_markdown_title(body: etree._Element) -> None:
    children = list(body)
    start_index = next(
        (
            index
            for index, child in enumerate(children)
            if child.tag == qn("bookmarkStart") and child.get(qn("name")) == "gauntlet"
        ),
        None,
    )
    if start_index is None:
        return

    end_index = next(
        (
            index
            for index in range(start_index + 1, len(children))
            if children[index].tag == qn("bookmarkStart")
            and children[index].get(qn("name")) == "welcome-to-gauntlet"
        ),
        None,
    )
    if end_index is None:
        raise RuntimeError(
            "Could not locate the Welcome to Gauntlet bookmark after the duplicate title block"
        )

    for child in children[start_index:end_index]:
        body.remove(child)


def finalize(path: Path) -> None:
    if not path.is_file():
        raise FileNotFoundError(path)

    with zipfile.ZipFile(path, "r") as source:
        document_xml = source.read(DOCUMENT_XML)
        root = etree.fromstring(document_xml)
        body = root.find("w:body", namespaces=NS)
        if body is None:
            raise RuntimeError("Generated DOCX has no document body")

        replace_toc(body)
        remove_duplicate_markdown_title(body)
        updated_xml = etree.tostring(
            root,
            xml_declaration=True,
            encoding="UTF-8",
            standalone=True,
        )

        with tempfile.NamedTemporaryFile(
            prefix=f"{path.stem}-",
            suffix=".docx",
            dir=path.parent,
            delete=False,
        ) as temporary:
            temporary_path = Path(temporary.name)

        try:
            with zipfile.ZipFile(temporary_path, "w") as target:
                for item in source.infolist():
                    payload = updated_xml if item.filename == DOCUMENT_XML else source.read(item.filename)
                    target.writestr(item, payload)
            temporary_path.replace(path)
        finally:
            temporary_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("docx", type=Path, help="Generated Rulebook DOCX to finalize in place")
    args = parser.parse_args()
    finalize(args.docx.resolve())
    print(f"Finalized visible Rulebook contents in {args.docx}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
