#!/bin/bash

# Usage: ./deploy.sh <PROJECT_ID> [REGION]

SERVICE_NAME="sourcex-bot-backend"
PROJECT_ID=$1
REGION=${2:-us-central1}

if [ -z "$PROJECT_ID" ]; then
    echo "❌ Error: Project ID is required."
    echo "Usage: ./deploy.sh <PROJECT_ID> [REGION]"
    exit 1
fi

echo "🚀 Deploying $SERVICE_NAME to $PROJECT_ID ($REGION)..."

# 1. Enable APIs
echo "Enabling necessary APIs..."
gcloud services enable cloudbuild.googleapis.com run.googleapis.com --project "$PROJECT_ID"

# 2. Build and Push
echo "📦 Building container..."
gcloud builds submit --tag "gcr.io/$PROJECT_ID/$SERVICE_NAME" . --project "$PROJECT_ID"

# 3. Deploy
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy "$SERVICE_NAME" \
  --image "gcr.io/$PROJECT_ID/$SERVICE_NAME" \
  --platform managed \
  --region "$REGION" \
  --allow-unauthenticated \
  --min-instances 1 \
  --port 3000 \
  --project "$PROJECT_ID"
# Add --set-env-vars key=value,key2=value2 here for DB credentials

echo "✅ Deployment successful!"
echo "📝 Note: Don't forget to set your environment variables (DB_HOST, DB_USER, etc.) using:"
echo "   gcloud run services update $SERVICE_NAME --update-env-vars KEY=VALUE"
