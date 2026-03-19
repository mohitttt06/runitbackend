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

// Code execution route
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
          { headers: { 'Content-Type': 'application/json' } }
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
    res.status(500).json({ error: 'Execution failed', details: error.message })
  }
})

// AI test case generation route
app.post('/api/ai', async (req, res) => {
  const { problem, code, count } = req.body

  const prompt = `You are a competitive programming assistant.

${problem ? `Problem Statement:\n${problem}` : ''}
${code ? `User's Code:\n${code}` : ''}

Generate exactly ${count || 5} diverse test cases for this problem.
Include simple cases, edge cases, and corner cases.

Respond ONLY in this exact JSON format with no extra text:
{
  "testCases": [
    {
      "input": "exact input here",
      "expectedOutput": "exact expected output here",
      "description": "what this case tests"
    }
  ]
}`

  try {
    const response = await axios.post(
      'https://api.puter.com/drivers/call',
      {
        interface: 'puter-chat-completion',
        driver: 'claude-sonnet-4-5',
        method: 'complete',
        args: {
          messages: [{ role: 'user', content: prompt }]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer anonymous'
        }
      }
    )

    console.log('Puter response:', JSON.stringify(response.data))

    const message = response.data?.result?.message?.content?.[0]?.text || ''
    console.log('AI message:', message)

    const clean = message.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    res.json(parsed)

  } catch (error) {
    console.log('AI Error:', error.response?.data || error.message)
    res.status(500).json({
      error: 'AI request failed',
      details: error.response?.data || error.message
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
