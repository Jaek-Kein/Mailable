---
name: portfolio-writer
description: >
  개발자 포트폴리오 마크다운 문서를 자동으로 생성하는 스킬.
  Claude Code가 프로젝트 폴더를 직접 탐색하여 코드, README, Git 히스토리,
  설정 파일 등을 분석한 뒤 구조화된 포트폴리오 문서를 작성한다.
  다음 상황에서 반드시 이 스킬을 사용할 것:
  - "포트폴리오 만들어줘", "포트폴리오 작성", "portfolio 생성" 요청 시
  - 프로젝트 폴더를 분석해서 문서화하고 싶을 때
  - 기술 스택, 트러블슈팅, 회고를 포함한 개발 문서가 필요할 때
  - GitHub 통계나 커밋 히스토리를 포트폴리오에 넣고 싶을 때
  - 취업/이직용 프로젝트 정리 문서가 필요할 때
---

# Portfolio Writer

Claude Code가 프로젝트 폴더를 직접 탐색하여 개발자 포트폴리오 마크다운을 생성하는 스킬.

---

## 실행 흐름

### 1단계: 프로젝트 탐색

아래 순서로 프로젝트 루트를 파악한다.

```bash
# 디렉토리 구조 파악
find . -maxdepth 2 -type f | head -60

# Git 정보 수집
git log --oneline --since="1 year ago" | wc -l        # 연간 커밋 수
git log --oneline -20                                   # 최근 커밋 메시지
git log --format="%ad" --date=short | sort | uniq -c   # 날짜별 커밋 분포
git shortlog -sn --no-merges | head -5                 # 기여자 (본인 확인용)
git branch -a | head -10                               # 브랜치 목록
git tag --sort=-creatordate | head -5                  # 버전 태그

# 파일 규모
find . -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
       -o -name "*.py" -o -name "*.go" -o -name "*.java" \
  | grep -v node_modules | grep -v .git | wc -l
```

읽어야 할 파일 (우선순위 순):
1. `README.md` / `README.ko.md`
2. `package.json` / `pyproject.toml` / `go.mod` / `pom.xml` / `Cargo.toml`
3. `CHANGELOG.md` / `HISTORY.md`
4. `.env.example` (기능 힌트용, 실제 값 노출 금지)
5. `docs/` 폴더 내 문서
6. CI 설정: `.github/workflows/*.yml` / `Dockerfile` / `docker-compose.yml`
7. 테스트 폴더: `tests/`, `__tests__/`, `spec/`

---

### 2단계: 기술 스택 추출

의존성 파일에서 스택을 자동 추출한다. 자세한 추출 규칙은 → `references/tech-stack-rules.md` 참고.

핵심 원칙:
- **직접 명시된 것만** 스택으로 기재한다. 추측하지 않는다.
- 버전이 있으면 함께 기재한다.
- 카테고리로 묶는다: Language / Framework / Database / Infra / Testing / Tools

---

### 3단계: 트러블슈팅 추출

다음 소스에서 트러블슈팅 소재를 찾는다:

```bash
# 커밋 메시지에서 fix/bug/hotfix 패턴 검색
git log --oneline --all | grep -iE "fix|bug|hotfix|issue|resolve|workaround" | head -20

# 이슈 관련 주석 검색
grep -r "TODO\|FIXME\|HACK\|XXX\|WORKAROUND" --include="*.ts" --include="*.py" \
  --include="*.js" --include="*.go" -l | grep -v node_modules | head -10
```

추출 규칙:
- 단순 오타 수정, 변수명 변경은 제외
- 아키텍처 결정, 성능 이슈, 라이브러리 충돌, 배포 장애 등을 우선 포함
- 소재가 부족하면 커밋 메시지를 보고 **합리적으로 추론**하되, 추론임을 내부적으로 인지하고 과장하지 않는다

트러블슈팅 항목 작성 형식 → `references/troubleshooting-template.md` 참고.

---

### 4단계: 마크다운 문서 생성

출력 파일: `PORTFOLIO.md` (프로젝트 루트에 저장)

문서 구조와 작성 규칙은 → `references/portfolio-template.md` 참고.

**작성 시 금지사항:**
- `.env`의 실제 시크릿 값 절대 노출 금지
- 존재하지 않는 기능 추가 금지
- 근거 없는 성능 수치 ("50% 향상" 등) 작성 금지
- README에 없는 내용을 있는 것처럼 기재 금지

---

### 5단계: 사용자 확인 요청

문서 생성 후 반드시 다음을 안내한다:

```
PORTFOLIO.md 생성 완료.

확인해주세요:
- 기술 스택이 누락되거나 잘못된 항목이 있나요?
- 트러블슈팅 내용 중 수정하거나 추가할 내용이 있나요?
- 프로젝트 성과/지표 중 직접 채워넣을 수치가 있나요?
  (예: DAU, 응답속도, 처리량 등 — 코드에서 확인 불가한 운영 수치)
```

---

## 엣지 케이스

| 상황 | 대응 |
|------|------|
| Git 히스토리 없음 | 파일 구조와 의존성만으로 작성, 커밋 섹션 생략 |
| README 없음 | 폴더명 + 진입점 파일(main.py, index.ts 등)으로 프로젝트 추론 |
| 모노레포 | 각 패키지를 별도 프로젝트로 분리하여 작성 |
| 비공개 프로젝트 | 기술적 내용만 작성, 클라이언트명/도메인은 익명 처리 권장 안내 |
| 커밋 메시지가 전부 영어 | 영어 그대로 인용, 번역은 하지 않음 |

---

## 멀티 프로젝트 모드

프로젝트가 여러 개인 경우 (상위 디렉토리에서 실행 시):

```bash
# 하위 Git 저장소 탐색
find . -name ".git" -maxdepth 3 -type d | sed 's|/.git||' | sort
```

각 프로젝트를 독립적으로 분석하여 하나의 `PORTFOLIO.md`에 통합한다.
각 프로젝트는 `## 프로젝트명` 섹션으로 구분.

---

## 참고 파일

- `references/portfolio-template.md` — 최종 문서 구조 및 작성 예시
- `references/tech-stack-rules.md` — 기술 스택 추출 및 분류 규칙
- `references/troubleshooting-template.md` — 트러블슈팅 항목 작성 형식
