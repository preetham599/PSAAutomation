# Evals Automation — Spend Analyzer API & LangFuse Validation
This project automates the Evals Flow for Spend Analyzer API using CodeceptJS + Playwright
It validates:
- Spend API responses
- LangFuse trace creation & mapping
- Excel Report Generation
- Multi-step Evals scenarios

# Tech Stack
| Tool | Purpose |
|------|---------|
| Node.js | Runtime |
| CodeceptJS | Testing framework |
| Playwright | API + UI automation |
| XLSX | Excel parsing |
| dotenv | Environment variables |
| LangFuse API Client | Model trace validations |

## Project Structure
project-folder/
│
├─ tests/
│ ├─ api/
│ │ ├─ spendAgentClient.ts
│ │ ├─ langFuseClient.ts
│ │ └─ evalsWithReport_test.ts
│
├─ codecept.api.conf.ts
├─ package.json
├─ .gitignore
└─ README.md

> Never commit `.env` — it’s already ignored in `.gitignore`

##  Installation
npm install
npx playwright install

## To run
npx codeceptjs run --config codecept.api.conf.ts tests/api/evalsWithReport_test.ts --verbose

