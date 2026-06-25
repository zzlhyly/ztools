export default {
  app: {
    title: 'ztools',
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    system: 'System',
  },
  tools: {
    json: {
      name: 'JSON Formatter',
      description: 'Format, minify, and validate JSON data',
    },
    xml: {
      name: 'XML Formatter',
      description: 'Format, minify, and validate XML data',
    },
    base64: {
      name: 'Base64 Encoder/Decoder',
      description: 'Encode and decode Base64',
    },
    url: {
      name: 'URL Encoder/Decoder',
      description: 'Encode and decode URLs',
    },
    timestamp: {
      name: 'Timestamp Converter',
      description: 'Convert between timestamps and dates',
    },
    regex: {
      name: 'Regex Tester',
      description: 'Test and match regular expressions',
    },
    color: {
      name: 'Color Converter',
      description: 'Convert between HEX, RGB, and HSL colors',
    },
    hash: {
      name: 'Hash Calculator',
      description: 'Calculate SHA1, SHA256, SHA384, SHA512 hashes',
    },
  },
  common: {
    input: 'Input',
    output: 'Output',
    format: 'Format',
    minify: 'Minify',
    encode: 'Encode',
    decode: 'Decode',
    copy: 'Copy',
    paste: 'Paste',
    clear: 'Clear',
    swap: 'Swap',
    convert: 'Convert',
    test: 'Test',
    calculate: 'Calculate',
    copied: 'Copied to clipboard',
    error: 'Error',
    success: 'Success',
    placeholder: 'Enter content...',
  },
  errors: {
    jsonSyntax: 'JSON syntax error: {message}',
    xmlSyntax: 'XML syntax error',
    invalidInput: 'Invalid input',
    unknown: 'Unknown error',
  },
}