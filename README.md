# Chatwoot ↔ Dify Middleware

Middleware kết nối Chatwoot và Dify.ai: khi agent viết private note `/email` trong một conversation, middleware lấy lịch sử hội thoại, gọi Dify để tạo draft email tiếng Anh, và đăng draft đó lại dưới dạng private note để agent xem xét trước khi gửi thủ công.

Xem chi tiết kiến trúc, flow, và checklist triển khai trong [`PLAN.md`](./PLAN.md).

## Cài đặt

```bash
npm install
cp .env.example .env
# điền CHATWOOT_BASE_URL, CHATWOOT_API_TOKEN, CHATWOOT_ACCOUNT_ID,
# CHATWOOT_WEBHOOK_SECRET, DIFY_BASE_URL, DIFY_API_KEY vào .env
```

## Chạy

```bash
npm run dev     # dev mode với hot reload
npm run build && npm start   # production
```

## Test

```bash
npm test
```

## Chạy bằng Docker (khuyến nghị khi deploy server)

```bash
cp .env.example .env
# điền đầy đủ biến môi trường thật vào .env

docker compose up -d --build
```

- Image build theo kiểu multi-stage: stage 1 compile TypeScript, stage 2 chỉ chứa `dist/` + dependencies production (không có `typescript`, `tsx`).
- Container chạy bằng user không phải root.
- Thư mục `data/` (chứa `jobs.json`) được mount qua named volume `middleware-data` để không mất job khi container restart/redeploy.
- Có sẵn healthcheck gọi `GET /health` mỗi 30s.

Xem log / restart / down:

```bash
docker compose logs -f
docker compose restart
docker compose down          # giữ lại volume data
docker compose down -v       # xoá luôn volume data (mất job history)
```

Cập nhật code mới rồi deploy lại:

```bash
git pull
docker compose up -d --build
```

Nếu không dùng `docker compose`, có thể build/run thủ công:

```bash
docker build -t chatwoot-dify-middleware .
docker run -d --name chatwoot-dify-middleware \
  --env-file .env \
  -p 3000:3000 \
  -v middleware-data:/app/data \
  --restart unless-stopped \
  chatwoot-dify-middleware
```

## Kết nối với Chatwoot

1. Vào **Settings → Integrations → Webhooks → New Webhook**.
2. URL: `https://<your-domain>/webhook/chatwoot`.
3. Subscribe: `Message Created`.
4. Đặt `CHATWOOT_WEBHOOK_SECRET` khớp với secret cấu hình trên Chatwoot (nếu Chatwoot hỗ trợ ký webhook).

## Kết nối với Dify

1. Tạo app Chatflow hoặc Workflow trong Dify.
2. Cấu hình input variables: `conversation_context`, `customer_name`, `customer_email`, `draft_request`.
3. Cấu hình app trả lời dưới dạng JSON: `{ "subject": "...", "body": "..." }`.
4. Copy API key vào `DIFY_API_KEY`, đặt `DIFY_APP_TYPE=chatflow` hoặc `workflow`.

## Cách dùng

Trong Chatwoot, agent viết private note:

```
/email
```

hoặc kèm gợi ý cụ thể:

```
/email Please apologize for the delay and confirm refund timeline.
```

Vài giây sau, middleware sẽ đăng một private note mới chứa draft email tiếng Anh, kết thúc bằng chữ ký "Ostenex Support". Agent xem xét, chỉnh sửa nếu cần, rồi gửi email thật thủ công.

## Giới hạn hiện tại (MVP)

- Không tự động gửi email — chỉ tạo draft.
- Job store dạng file JSON (`data/jobs.json`), phù hợp 1 instance chạy tại một thời điểm. Chuyển PostgreSQL nếu scale nhiều worker song song.
- Không giữ context hội thoại Dify qua nhiều lần gọi — mỗi lần `/email` là một request độc lập với context hiện tại của conversation.
