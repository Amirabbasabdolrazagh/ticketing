const RTL_MARK = "\u200F";

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function escapeBaleMarkdown(value) {
  return String(value ?? "").replace(/([\\_*`[])/g, "\\$1");
}

export function forceRtlLines(value) {
  return String(value ?? "")
    .split("\n")
    .map((line) => `${RTL_MARK}${line}`)
    .join("\n");
}

export function htmlToBaleMarkdown(value) {
  const boldParts = [];
  const tokenized = String(value ?? "").replace(
    /<(?:b|strong)>(.*?)<\/(?:b|strong)>/gis,
    (_, content) => {
      const index = boldParts.push(content) - 1;
      return `\uE000${index}\uE001`;
    },
  );

  let markdown = escapeBaleMarkdown(
    decodeHtmlEntities(tokenized.replace(/<[^>]+>/g, "")),
  );

  markdown = markdown.replace(/\uE000(\d+)\uE001/g, (_, index) => {
    const content = decodeHtmlEntities(
      String(boldParts[Number(index)] ?? "").replace(/<[^>]+>/g, ""),
    );
    return `*${escapeBaleMarkdown(content)}*`;
  });

  return markdown;
}
