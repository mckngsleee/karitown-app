# Architecture

Karitown uses a 3-tier serverless design on AWS, in the Singapore region (`ap-southeast-1`), the closest to the Philippines.

<img width="1199" height="630" alt="Karitown-diagram drawio" src="https://github.com/user-attachments/assets/fe278170-b549-4524-81cf-71911558a366" />

## How one purchase flows

Steps 3–5 currently run locally and will run on AWS once deployed.

- **1.** On opening, the app reads saved records and waiting changes from the phone (`localStorage`).
- **2a.** A new purchase is saved on the phone with its own ID and added to the upload queue, even offline.
- **2b.** When online, the app (`store/sync.ts`) sends waiting changes in order to API Gateway over HTTPS, with the API key.
- **3.** Lambda checks the key and the shop's rules (`backend/app/rules/`), and that the truck load is open.
- **4.** DynamoDB saves the purchase only if its ID is new (conditional write), so retries never duplicate it.
- **5.** The server confirms the request, and the phone marks the record as uploaded. If local data is missing, the device restores records via restoreIfNew().

## How the app reaches the phone

Steps A and B are planned AWS hosting.

- **A** The phone gets the app over HTTPS from CloudFront on first use, and updates when online.
- **B** CloudFront gets missing files from the S3 bucket (cache miss); only CloudFront can read it (OAC).
- **C** The service worker (Workbox) saves the app's files on the phone (Cache Storage).
- **D** The app opens from those files, even with no signal.

## Why these services

| Need | Choice | Reason |
|---|---|---|
| Run the API | **AWS Lambda** | No server to manage or patch, pay per request, and virtually free at demo traffic levels |
| Public URL | **API Gateway HTTP API** | HTTPS out of the box, cheaper and simpler than the REST API type |
| Store data | **DynamoDB, on-demand** | Serverless NoSQL database with automatic scaling and free tier coverage for demos |
| See errors | **CloudWatch Logs** | Automatically logs every function error and retains them for 14 days |
| Automate deployment | **AWS CDK (Python)** | IaC written in the same language as the app with a single command to deploy or delete |

## Data model

One DynamoDB table with two keys:

| Key | Example | Meaning |
|---|---|---|
| `kind` (partition key) | `purchase` | What type of record it is |
| `id` (sort key) | `3f2c…` | The record's own id |

"All purchases" is a single query: `kind = "purchase"`. Receipt numbers (PUR-0001, L-0001, SAL-0001) come from counter items with `kind = "counter"`, updated atomically.

## Security

- The API needs an `x-api-key` header. The key is set at deploy time and never stored in the code.
- The Lambda function may read and write only its own table (least-privilege IAM, granted by CDK).
- Point-in-time recovery is on for the table.
