"use client";

import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { useTemplateStore, type EmailTemplate } from "@/src/store/useTemplateStore";

/* ────────── Styled Components ────────── */
const Page = styled.main`
    max-width: 960px;
    margin: 2rem auto;
    padding: 0 1rem;
    display: grid;
    gap: 1.5rem;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
`;

const Title = styled.h1`
    margin: 0;
    font-size: 1.35rem;
    color: #0f172a;
`;

const PrimaryBtn = styled.button`
    appearance: none;
    background: #2563eb;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 8px 16px;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    &:hover { background: #1d4ed8; }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
`;

const GhostBtn = styled.button`
    appearance: none;
    background: transparent;
    color: #475569;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 6px 12px;
    font-size: 0.8rem;
    cursor: pointer;
    &:hover { background: #f8fafc; }
`;

const DangerBtn = styled(GhostBtn)`
    color: #ef4444;
    border-color: #fecaca;
    &:hover { background: #fef2f2; }
`;

const Grid = styled.div`
    display: grid;
    gap: 1rem;
`;

const Card = styled.article`
    background: #fff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 1.25rem 1.5rem;
    display: grid;
    gap: 0.5rem;
`;

const CardHeader = styled.div`
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
`;

const CardTitle = styled.h3`
    margin: 0;
    font-size: 1rem;
    color: #0f172a;
`;

const CardSub = styled.p`
    margin: 0;
    font-size: 0.85rem;
    color: #64748b;
`;

const Actions = styled.div`
    display: flex;
    gap: 0.5rem;
`;

const Empty = styled.div`
    text-align: center;
    padding: 3rem 1rem;
    color: #94a3b8;
    font-size: 0.9rem;
`;

const ErrorMsg = styled.div`
    color: #ef4444;
    background: #fef2f2;
    border-radius: 8px;
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
`;

/* ────────── Modal ────────── */
const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.45);
    display: grid;
    place-items: center;
    z-index: 50;
    padding: 1rem;
`;

const Modal = styled.div`
    background: #fff;
    border-radius: 16px;
    padding: 1.75rem;
    width: 100%;
    max-width: 680px;
    display: grid;
    gap: 1.25rem;
    max-height: 90vh;
    overflow-y: auto;
`;

const ModalTitle = styled.h2`
    margin: 0;
    font-size: 1.1rem;
    color: #0f172a;
`;

const Field = styled.div`
    display: grid;
    gap: 0.4rem;
`;

const Label = styled.label`
    font-size: 0.8rem;
    font-weight: 600;
    color: #475569;
`;

const Input = styled.input`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const Textarea = styled.textarea`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 0.875rem;
    width: 100%;
    box-sizing: border-box;
    resize: vertical;
    min-height: 120px;
    font-family: inherit;
    &:focus { outline: 2px solid #2563eb; outline-offset: 1px; }
`;

const HtmlArea = styled(Textarea)`
    min-height: 200px;
    font-family: "Courier New", monospace;
    font-size: 0.8rem;
`;

const ModalFooter = styled.div`
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
`;

const Hint = styled.p`
    margin: 0;
    font-size: 0.78rem;
    color: #94a3b8;
`;

/* ────────── 타입 ────────── */
interface FormState {
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
}

const defaultForm: FormState = {
  name: "",
  subject: "",
  htmlContent: "",
  textContent: "",
};

/* ────────── 컴포넌트 ────────── */
export default function TemplatesPage() {
  const { templates, loading, error, fetchTemplates, createTemplate, updateTemplate, removeTemplate } =
    useTemplateStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  function openCreate() {
    setEditing(null);
    setForm(defaultForm);
    setLocalError(null);
    setModalOpen(true);
  }

  function openEdit(t: EmailTemplate) {
    setEditing(t);
    setForm({ name: t.name, subject: t.subject, htmlContent: t.htmlContent, textContent: t.textContent });
    setLocalError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
    setForm(defaultForm);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.htmlContent.trim()) {
      setLocalError("이름, 제목, HTML 내용은 필수입니다.");
      return;
    }
    setSaving(true);
    setLocalError(null);
    try {
      if (editing) {
        await updateTemplate(editing.id, form);
      } else {
        await createTemplate(form);
      }
      closeModal();
    } catch {
      setLocalError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}" 템플릿을 삭제하시겠습니까?`)) return;
    await removeTemplate(id);
  }

  return (
    <Page>
      <Header>
        <Title>이메일 템플릿</Title>
        <PrimaryBtn onClick={openCreate}>+ 새 템플릿</PrimaryBtn>
      </Header>

      {(error) && <ErrorMsg>{error}</ErrorMsg>}

      {loading && templates.length === 0 ? (
        <Empty>불러오는 중...</Empty>
      ) : templates.length === 0 ? (
        <Empty>
          아직 템플릿이 없습니다.<br />
          "새 템플릿" 버튼으로 첫 템플릿을 만들어 보세요.
        </Empty>
      ) : (
        <Grid>
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader>
                <div>
                  <CardTitle>{t.name}</CardTitle>
                  <CardSub>제목: {t.subject}</CardSub>
                </div>
                <Actions>
                  <GhostBtn onClick={() => openEdit(t)}>수정</GhostBtn>
                  <DangerBtn onClick={() => handleDelete(t.id, t.name)}>삭제</DangerBtn>
                </Actions>
              </CardHeader>
              <Hint>
                플레이스홀더: {"{{이름}}"}, {"{{이메일}}"} 등 CSV 컬럼명을 {"{{}} "}로 감싸 사용
              </Hint>
            </Card>
          ))}
        </Grid>
      )}

      {modalOpen && (
        <Overlay onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <Modal>
            <ModalTitle>{editing ? "템플릿 수정" : "새 템플릿 만들기"}</ModalTitle>
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
              <Field>
                <Label htmlFor="name">템플릿 이름 *</Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} placeholder="예) 행사 안내 메일" />
              </Field>
              <Field>
                <Label htmlFor="subject">이메일 제목 *</Label>
                <Input id="subject" name="subject" value={form.subject} onChange={handleChange} placeholder="예) [{{행사명}}] 참가 안내" />
              </Field>
              <Field>
                <Label htmlFor="htmlContent">HTML 내용 *</Label>
                <HtmlArea
                  id="htmlContent"
                  name="htmlContent"
                  value={form.htmlContent}
                  onChange={handleChange}
                  placeholder={`<p>안녕하세요, {{이름}}님!</p>\n<p>{{행사명}} 행사에 초대합니다.</p>`}
                />
                <Hint>{"{{컬럼명}}"} 형식으로 CSV 데이터를 삽입할 수 있습니다.</Hint>
              </Field>
              <Field>
                <Label htmlFor="textContent">텍스트 내용 (선택)</Label>
                <Textarea
                  id="textContent"
                  name="textContent"
                  value={form.textContent}
                  onChange={handleChange}
                  placeholder="HTML을 지원하지 않는 메일 클라이언트용 텍스트 버전"
                />
              </Field>
              {localError && <ErrorMsg>{localError}</ErrorMsg>}
              <ModalFooter>
                <GhostBtn type="button" onClick={closeModal}>취소</GhostBtn>
                <PrimaryBtn type="submit" disabled={saving}>
                  {saving ? "저장 중..." : editing ? "저장" : "만들기"}
                </PrimaryBtn>
              </ModalFooter>
            </form>
          </Modal>
        </Overlay>
      )}
    </Page>
  );
}
