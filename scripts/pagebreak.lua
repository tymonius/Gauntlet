function Div(el)
  if el.classes:includes('docx-page-break') then
    if FORMAT:match('docx') then
      return pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    end
    return {}
  end

  if el.classes:includes('page-break') then
    if FORMAT:match('docx') then
      return pandoc.RawBlock('openxml', '<w:p><w:r><w:br w:type="page"/></w:r></w:p>')
    elseif FORMAT:match('html') then
      return pandoc.RawBlock('html', '<div class="page-break"></div>')
    elseif FORMAT:match('latex') then
      return pandoc.RawBlock('latex', '\\newpage')
    end
  end
  return el
end
