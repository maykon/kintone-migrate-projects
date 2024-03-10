export const normalize = (text) => {
  const normalizedTxt = text.replace(/\*/g, '')
    .replace(/"|\{|\}|\*|:|<|>|\?|\/|\%|\+|\|/g, '')
    .replace(/\r|\t/g, '')
    .replace(/\n/g, ' - ')
    .replace(/\&/g, 'and')
    .replace(/\.+/, '.')
    .replace(/^~/, '')
    .replace(/^\.|\.$/, '')
    .replace(/\s+/, ' ')
    .trim();
  return replaceOutlookInvalidNames(normalizedTxt);
};

export const replaceOutlookInvalidNames = (str) => {
  const invalidNames = ['.lock','CON','PRN','AUX','NUL','_vti_','desktop.ini',
    ...[...Array(10)].map((_, i) => `COM${i}`),
    ...[...Array(10)].map((_, i) => `LPT${i}`),
    ];
  const numberTxt = (Math.random() * 1000).toFixed(0);
  if (/_vti_/.test(str)) {
    return 'vti'.concat(numberTxt);
  }
  if (invalidNames.includes(str)) {
    return str.concat(numberTxt);
  }
  return str;
};

export const encode = (text) => {
  return encodeRFC3986URIComponent(normalize(text));
};

export const encodeRFC3986URIComponent = (str) => {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`,
  );
};

export const decode = (text) => {
  return decodeURIComponent(normalize(text));
};