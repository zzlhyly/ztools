export default {
  app: {
    title: 'ztools',
  },
  tools: {
    json: {
      name: 'JSON 格式化',
      description: 'JSON 数据格式化、压缩、验证',
    },
    xml: {
      name: 'XML 格式化',
      description: 'XML 数据格式化、压缩、验证',
    },
    base64: {
      name: 'Base64 编解码',
      description: 'Base64 编码和解码',
    },
    url: {
      name: 'URL 编解码',
      description: 'URL 编码和解码',
    },
    timestamp: {
      name: '时间戳转换',
      description: '时间戳与日期时间互转',
    },
    regex: {
      name: '正则表达式测试',
      description: '正则表达式测试和匹配',
    },
    color: {
      name: '颜色转换',
      description: 'HEX、RGB、HSL 颜色互转',
    },
    hash: {
      name: '哈希计算',
      description: 'SHA1、SHA256、SHA384、SHA512 哈希计算',
    },
  },
  common: {
    input: '输入',
    output: '输出',
    format: '格式化',
    minify: '压缩',
    encode: '编码',
    decode: '解码',
    copy: '复制',
    paste: '粘贴',
    clear: '清空',
    swap: '交换',
    convert: '转换',
    test: '测试',
    calculate: '计算',
    copied: '已复制到剪贴板',
    error: '错误',
    success: '成功',
    placeholder: '请输入内容...',
  },
  errors: {
    jsonSyntax: 'JSON 语法错误: {message}',
    xmlSyntax: 'XML 语法错误',
    invalidInput: '输入内容无效',
    unknown: '未知错误',
  },
}