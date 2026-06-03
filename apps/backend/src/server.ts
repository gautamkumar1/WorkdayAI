import 'dotenv/config'
import app from './app'

const port = parseInt(process.env['PORT'] ?? '3000', 10)

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend running on port ${port}`)
})
