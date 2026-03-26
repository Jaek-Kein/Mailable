# 기술 스택 추출 규칙

의존성 파일별 파싱 방법과 카테고리 분류 기준.

---

## 파일별 파싱 전략

### package.json (Node.js / JavaScript / TypeScript)

```bash
cat package.json | python3 -c "
import json, sys
d = json.load(sys.stdin)
deps = list(d.get('dependencies', {}).keys())
dev = list(d.get('devDependencies', {}).keys())
print('DEPS:', deps)
print('DEV:', dev)
"
```

**언어 판별**: `devDependencies`에 `typescript`가 있으면 TypeScript. 없으면 JavaScript.  
**버전**: `package-lock.json` 또는 `node_modules/패키지/package.json`에서 실제 설치 버전 확인.

### pyproject.toml / requirements.txt (Python)

```bash
# pyproject.toml
grep -A 50 '\[tool.poetry.dependencies\]\|\[project\]' pyproject.toml | head -30

# requirements.txt
cat requirements.txt | grep -v "^#" | grep -v "^$"
```

**Python 버전**: `python_requires` 또는 `.python-version` 파일 확인.

### go.mod (Go)

```bash
head -5 go.mod   # Go 버전 + 모듈명
grep 'require' go.mod -A 30 | head -20
```

### pom.xml (Java/Kotlin + Maven)

```bash
# 주요 의존성만 추출
grep -E '<artifactId>|<version>' pom.xml | head -30
# Java 버전
grep 'java.version\|maven.compiler' pom.xml
```

### Cargo.toml (Rust)

```bash
grep -A 30 '\[dependencies\]' Cargo.toml | head -30
```

### build.gradle (Kotlin/Java + Gradle)

```bash
grep -E "implementation|api|compileOnly" build.gradle | grep -v "//" | head -20
```

---

## 카테고리 분류 기준

### Language
런타임/컴파일 언어. 버전 포함.
- `typescript` in devDeps → TypeScript
- `@types/node` 있으면 Node.js 버전 확인 (`engines.node` 또는 `.nvmrc`)

### Framework
애플리케이션 뼈대가 되는 핵심 프레임워크.

| 패키지명 | 표기 |
|----------|------|
| `next` | Next.js |
| `react` | React |
| `vue` | Vue.js |
| `@angular/core` | Angular |
| `express` | Express |
| `fastapi` | FastAPI |
| `django` | Django |
| `flask` | Flask |
| `spring-boot` (pom) | Spring Boot |
| `gin-gonic/gin` (go.mod) | Gin |
| `axum` (Cargo) | Axum |

### Database
ORM, 드라이버, 클라이언트 패키지로 추론.

| 패키지명 | 표기 |
|----------|------|
| `pg`, `postgres`, `@prisma/client` | PostgreSQL |
| `mysql2`, `mysql` | MySQL |
| `mongoose`, `mongodb` | MongoDB |
| `redis`, `ioredis` | Redis |
| `better-sqlite3`, `sqlite3` | SQLite |
| `prisma` | Prisma ORM |
| `typeorm` | TypeORM |
| `sqlalchemy` | SQLAlchemy |

### Infra
배포/운영 인프라. 설정 파일에서 확인.

| 소스 | 판별 기준 |
|------|-----------|
| `Dockerfile` 존재 | Docker |
| `docker-compose.yml` 존재 | Docker Compose |
| `.github/workflows/*.yml` 존재 | GitHub Actions |
| `vercel.json` 또는 `vercel` in scripts | Vercel |
| `netlify.toml` | Netlify |
| `.ebextensions/` | AWS Elastic Beanstalk |
| `serverless.yml` | Serverless Framework |
| `k8s/`, `kubernetes/` 폴더 | Kubernetes |

### Testing

| 패키지명 | 표기 |
|----------|------|
| `jest` | Jest |
| `vitest` | Vitest |
| `@testing-library/react` | Testing Library |
| `playwright` | Playwright |
| `cypress` | Cypress |
| `pytest` | pytest |
| `go test` (표준) | Go testing |

### Tools
코드 품질, 포맷팅, 빌드 도구.

| 패키지명 | 표기 |
|----------|------|
| `eslint` | ESLint |
| `prettier` | Prettier |
| `husky` | Husky (Git hooks) |
| `lint-staged` | lint-staged |
| `turbo` | Turborepo |
| `nx` | Nx |
| `webpack` | Webpack |
| `vite` | Vite |
| `esbuild` | esbuild |

---

## 판별 불가 케이스

- 동일 기능 패키지가 여러 개 (예: axios + fetch wrapper) → 둘 다 기재
- 내부 패키지 (`@company/xxx`) → 기재하지 않음
- 버전 확인 불가 → 버전 없이 패키지명만 기재
- 완전히 낯선 패키지 → npm/PyPI 검색 없이 패키지명 그대로 기재 (추측 금지)
