export function splitLines(input: string) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function formatLines(items: string[]) {
  return items.join("\n");
}

export function parseLineItems(input: string) {
  return splitLines(input).map((line, index) => {
    const colonIndex = line.indexOf(":");
    if (colonIndex > -1) {
      return {
        label: line.slice(0, colonIndex).trim(),
        value: line.slice(colonIndex + 1).trim(),
      };
    }

    const dashIndex = line.indexOf(" - ");
    if (dashIndex > -1) {
      return {
        label: line.slice(0, dashIndex).trim(),
        value: line.slice(dashIndex + 3).trim(),
      };
    }

    return {
      label: `Item ${index + 1}`,
      value: line,
    };
  });
}

export function formatLineItems(
  items: Array<{ label: string; value: string }>,
) {
  return items.map((item) => `${item.label}: ${item.value}`).join("\n");
}
