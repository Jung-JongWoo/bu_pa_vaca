#!/usr/bin/env bash
# 사용: ./deploy.sh "커밋 메시지"   (같은 폴더의 .env 의 GITHUB_TOKEN 사용)
set -e
cd "$(dirname "$0")"
[ -f .env ] || { echo ".env 가 없습니다. .env.example 을 복사해 토큰을 넣으세요."; exit 1; }
TOKEN=$(grep -E '^GITHUB_TOKEN=' .env | head -1 | cut -d= -f2- | tr -d "\"' \r")
[ -n "$TOKEN" ] || { echo ".env 에 GITHUB_TOKEN 이 없습니다."; exit 1; }
git add -A
git commit -m "${1:-update}" || true
git push "https://Jung-JongWoo:${TOKEN}@github.com/Jung-JongWoo/bu_pa_vaca.git" main
