#!/usr/bin/env bash
# Copy this file, fill in the two secret values, and NEVER commit the copy.
#
#   cp scripts/r2-env-example.sh ~/.video-studio-r2-env.sh
#   chmod 600 ~/.video-studio-r2-env.sh
#   # edit ~/.video-studio-r2-env.sh, paste in the real values
#
# Then before any r2-*.js script:
#   source ~/.video-studio-r2-env.sh
#
# Create an R2/S3 API token scoped to the single bucket you set as
# R2_BUCKET_NAME in config.env. The non-secret config (bucket name, endpoint,
# public URL, this studio's prefix) lives in config.env; the two values below
# are secrets and must never be committed.

export R2_ACCESS_KEY_ID="PASTE-HERE"
export R2_SECRET_ACCESS_KEY="PASTE-HERE"
