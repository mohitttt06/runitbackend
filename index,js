const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
app.use(cors())
app.use(express.json())

const LANGUAGE_IDS = {
  c: 50,
  cpp: 54,
  java: 62,
  javascript: 63,
  python: 71,
  go: 60,
  rust: 73,
  typescript: 74,
  kotlin: 78,
  swift: 83,
  csharp: 51,
  php: 68,
  ruby: 72
}

app.post('/api/execute', async (req, res) => {
  const { language, code, testCases } = req.body

  try {
    const results = await Promise.all(
      testCases.map(async (testCase) => {
        const submitRes = await axios.post(
          'https://ce.judge0.com/submissions?base64_encoded=false&wait=true',
          {
            source_code: code,
            language_id: LANGUAGE_IDS[language] || 71,
            stdin: testCase.input
          },
          {
            headers: { 'Content-Type': 'application/json' }
          }
        )

        const output = submitRes.data.stdout?.trim() || ''
        const expected = testCase.expectedOutput?.trim() || ''

        return {
          input: testCase.input,
          expectedOutput: expected,
          actualOutput: output,
          passed: output === expected,
          error: submitRes.data.stderr || null,
          status: submitRes.data.status?.description || 'Unknown'
        }
      })
    )

    res.json({
      results,
      summary: {
        total: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
      }
    })

  } catch (error) {
    res.status(500).json({
      error: 'Execution failed',
      details: error.message
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
