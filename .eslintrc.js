module.exports = {
  env: {
    node: true,
    es2021: true,
    browser: true,
  },
  extends: [
    'eslint:recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  rules: {
    // 基本规则
    'no-console': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'no-debugger': 'warn',
    
    // 代码风格
    'indent': ['warn', 2, { SwitchCase: 1 }],
    'quotes': ['warn', 'single', { avoidEscape: true }],
    'semi': ['warn', 'always'],
    'comma-dangle': ['warn', 'always-multiline'],
    'object-curly-spacing': ['warn', 'always'],
    'array-bracket-spacing': ['warn', 'never'],
    
    // 最佳实践
    'eqeqeq': ['warn', 'always'],
    'curly': ['warn', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    
    // ES6+
    'prefer-const': 'warn',
    'prefer-arrow-callback': 'warn',
    'arrow-spacing': 'warn',
    'no-var': 'warn',
  },
  overrides: [
    {
      // ESM 模块文件
      files: ['*.mjs'],
      parserOptions: {
        sourceType: 'module',
      },
    },
    {
      // 测试文件
      files: ['**/*.test.js', '**/tests/**/*.js'],
      env: {
        jest: true,
      },
      rules: {
        'no-console': 'off',
      },
    },
  ],
};

