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

// AI assistant route using Puter
app.post('/api/ai', async (req, res) => {
  const { mode, problem, code, language } = req.body

  const prompts = {
    explain: `You are a helpful coding assistant. Explain this coding problem clearly and simply for a student:

Problem: ${problem}

Give a clear explanation of what the problem is asking. Do not give the solution.`,

    hint: `You are a helpful coding assistant. Give a small helpful hint for this problem without revealing the full solution:

Problem: ${problem}
Student's current code in ${language}:
${code}

Give only 1-2 sentences as a hint. Do not give the full solution.`,

    review: `You are a helpful coding assistant. Review this code and suggest improvements:

Problem: ${problem}
Code in ${language}:
${code}

Give specific feedback on code quality, efficiency, and any improvements.`,

    debug: `You are a helpful coding assistant. Help debug this code:

Problem: ${problem}
Code in ${language}:
${code}

Identify the bugs and explain what's wrong. Give hints to fix them but don't rewrite the full solution.`
  }

  try {
    const response = await axios.post(
      'https://api.puter.com/drivers/call',
      {
        interface: 'puter-chat-completion',
        driver: 'claude-sonnet-4-5',
        method: 'complete',
        args: {
          messages: [
            {
              role: 'user',
              content: prompts[mode] || prompts.explain
            }
          ]
        }
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )

    const message = response.data?.result?.message?.content?.[0]?.text || 'No response'
    res.json({ response: message })

  } catch (error) {
    res.status(500).json({
      error: 'AI request failed',
      details: error.message
    })
  }
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
