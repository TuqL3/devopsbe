# Backend — hướng dẫn Phase 2

Repo `be` dùng Express 5, TypeScript strict, Prisma 7 và PostgreSQL. Frontend nằm trong repo độc lập `fe`.
Mỗi repo có package/lockfile, cấu hình và Git riêng; mọi lệnh trong tài liệu này chạy từ `be`.
Yêu cầu ban đầu được giữ tại [docs/project-brief.md](docs/project-brief.md).
Chưa có hạ tầng triển khai. Các lệnh Docker bên dưới do bạn tự chạy; ứng dụng và tests không gọi Docker.

## 1. Yêu cầu và cài dependencies

- Node.js 22.12 trở lên thuộc nhánh 22, hoặc Node.js 24 trở lên; npm 10+.
- PostgreSQL 17 qua official Docker image do bạn quản lý.

Từ thư mục repo `be`:

```sh
npm ci
cp .env.example .env
npm run db:generate
```

`npm ci` cần `package-lock.json`; `db:generate` không cần database đang chạy.
Generated Prisma Client nằm trong `src/generated/`, được bỏ qua bởi Git và được tạo lại khi build.

## 2. Tự khởi chạy PostgreSQL bằng Docker

Ví dụ dành cho local development, bạn tự chạy và thay mật khẩu minh họa:

```sh
export TODO_POSTGRES_PASSWORD='replace-with-your-local-password'
docker run --name acquisitions-postgres \
  -e POSTGRES_USER=todo \
  -e POSTGRES_PASSWORD="$TODO_POSTGRES_PASSWORD" \
  -e POSTGRES_DB=todo \
  -p 127.0.0.1:5432:5432 \
  -v acquisitions-pgdata:/var/lib/postgresql/data \
  -d postgres:17
```

Chờ PostgreSQL sẵn sàng:

```sh
docker exec acquisitions-postgres pg_isready -U todo -d todo
```

Database nằm trong named volume `acquisitions-pgdata`; không xóa volume nếu cần giữ dữ liệu.
Các biến `POSTGRES_*` chỉ khởi tạo credentials/database khi volume còn mới.
Tài khoản tạo bằng `POSTGRES_USER` ở ví dụ này là superuser local; khi triển khai thật, bạn cần cấp quyền theo vai trò ứng dụng và migration.

Sửa `.env`:

```dotenv
DATABASE_URL=postgresql://todo:YOUR_URL_ENCODED_PASSWORD@localhost:5432/todo?schema=public
HOST=0.0.0.0
PORT=3000
NODE_ENV=development
```

Thay password bằng mật khẩu đã đặt, percent-encode các ký tự đặc biệt trong username/password của URL.
Không commit `.env`, không gửi credentials qua chat và không đặt chúng vào biến `VITE_*`.
Biến môi trường của tiến trình có ưu tiên cao hơn `.env`.

Backend chạy trên host dùng `localhost` và cổng được publish. Nếu sau này backend chạy trong container cùng Docker network với PostgreSQL, dùng tên container/dịch vụ database và cổng nội bộ `5432`, ví dụ:

```dotenv
DATABASE_URL=postgresql://todo:YOUR_URL_ENCODED_PASSWORD@acquisitions-postgres:5432/todo?schema=public
```

Tên trên chỉ dùng được khi bạn đã nối các container vào network có hỗ trợ phân giải tên.
Nếu database chạy ngoài network đó, dùng hostname mà backend thực sự truy cập được.
`localhost` bên trong container backend trỏ về chính container backend.

## 3. Migration và chạy backend

Áp dụng migration đã có, kể cả trên database hoàn toàn mới:

```sh
npm run db:migrate:deploy
npm run db:migrate:status
npm run dev
```

Backend mặc định ở `http://localhost:3000`. Ứng dụng khởi động mà không tự chạy migration.
Khi database mất kết nối, tiến trình vẫn phục vụ liveness; readiness trả `503` và request CRUD thất bại trả lỗi JSON.

Khi chủ động thay schema ở môi trường phát triển:

```sh
npm run db:migrate:dev -- --name describe_change
npm run db:generate
```

`migrate dev` có thể cần quyền tạo shadow database và có thể đề nghị reset khi schema bị drift.
Chỉ dùng với database development, kiểm tra SQL trước khi commit; không chấp nhận reset với dữ liệu cần giữ.
Deployment chỉ áp dụng các migration đã review bằng `migrate deploy`, chạy một lần có kiểm soát trước khi khởi động phiên bản cần schema mới.
Prisma không tự tạo rollback an toàn; rollback schema cần kế hoạch riêng và có thể mất dữ liệu.

## 4. Tests và kiểm tra chất lượng

```sh
npm test
npm run lint
npm run type-check
npm run build
npm run start
```

- `npm test`: validation, cấu hình, HTTP contract với database stub, và tests tiến trình thực (signals, database không truy cập được). Không cần PostgreSQL đang chạy.
- `type-check`: kiểm tra cả source, tests và cấu hình TypeScript.
- `build`: sinh Prisma Client và biên dịch backend vào `dist`.
- `start`: chạy JavaScript đã build; không chạy migration hoặc TypeScript watcher.

Integration tests dùng PostgreSQL thật, bắt buộc database **riêng** với tên kết thúc bằng `_test`.
Bạn tự tạo database test khi container đã sẵn sàng:

```sh
docker exec acquisitions-postgres createdb -U todo todo_test
```

Thêm vào `.env`:

```dotenv
TEST_DATABASE_URL=postgresql://todo:YOUR_URL_ENCODED_PASSWORD@localhost:5432/todo_test?schema=public
```

Áp dụng migrations vào database test rồi chạy tests:

```sh
DATABASE_URL='postgresql://todo:YOUR_URL_ENCODED_PASSWORD@localhost:5432/todo_test?schema=public' npm run db:migrate:deploy
npm run test:integration
```

Thay URL minh họa bằng URL test của bạn. Không đổi `DATABASE_URL` chính trong `.env` thành URL test.
Integration tests không tự tạo database, chạy migration, truncate bảng hoặc reset schema.
Tests chỉ xóa các Todo do chúng tạo, dùng IDs được ghi nhận trong lượt test; bị kill đột ngột có thể để lại dữ liệu test.
Thiếu cấu hình/database/migration sẽ làm lệnh integration test thất bại, không được tính là pass hay âm thầm bỏ qua.
Không chạy đồng thời nhiều lượt integration tests trên cùng database.

## 5. API và health checks

```sh
curl http://localhost:3000/api/health/live
curl http://localhost:3000/api/health/ready
curl -i http://localhost:3000/api/todos \
  -H 'Content-Type: application/json' \
  -d '{"title":"Learn DevOps","description":"Apply a migration"}'
curl http://localhost:3000/api/todos
```

| Method | Endpoint | Thành công |
|---|---|---|
| GET | `/api/todos` | `200`, `{ "data": [...] }`, mới nhất trước |
| GET | `/api/todos/:id` | `200`, `{ "data": todo }` |
| POST | `/api/todos` | `201`, `{ "data": todo }` và `Location` |
| PATCH | `/api/todos/:id` | `200`, `{ "data": todo }` |
| DELETE | `/api/todos/:id` | `204`, không có body |
| GET | `/api/health/live` | `200`, `{ "status": "alive" }`, không truy vấn DB |
| GET | `/api/health/ready` | `200`, `{ "status": "ready" }`, thực hiện `SELECT 1` |

Todo có `id` UUID, `title`, `description`, `completed`, `createdAt`, `updatedAt`.
Timestamps là ISO 8601 UTC. `title` được trim, dài 1–200; `description` tối đa 5.000, mặc định `null`, chuỗi rỗng chuyển thành `null`.
Độ dài được kiểm tra theo JavaScript string length (UTF-16 code units). Chuỗi chứa null byte bị từ chối vì PostgreSQL không lưu được ký tự đó trong text.
`completed` là boolean, mặc định `false`. POST bắt buộc `title`; PATCH nhận ít nhất một trường trong `title`, `description`, `completed`.
Trường ngoài danh sách hoặc trường hệ thống do client gửi đều bị từ chối. JSON body tối đa 64 KB; POST/PATCH dùng `Content-Type: application/json`.

Lỗi có dạng:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Invalid Todo data","details":{"title":"Title must contain 1 to 200 characters after trimming, without null bytes"}}}
```

`details` chỉ xuất hiện khi có lỗi theo trường. Các mã lỗi:

| HTTP | Code | Ý nghĩa |
|---|---|---|
| 400 | `VALIDATION_ERROR` | JSON, UUID hoặc dữ liệu đầu vào không hợp lệ |
| 404 | `NOT_FOUND` | Không có Todo hoặc endpoint |
| 413 | `PAYLOAD_TOO_LARGE` | Body vượt giới hạn |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Content-Type, charset hoặc encoding không được hỗ trợ |
| 500 | `INTERNAL_ERROR` | Lỗi hệ thống, bao gồm CRUD khi DB không truy cập được |
| 503 | `NOT_READY` | Readiness thất bại hoặc backend đang shutdown |

Readiness kiểm tra kết nối DB, không xác nhận migration đã được áp dụng. Sau migration cần kiểm tra CRUD.

## 6. Giới hạn và hợp đồng vận hành hiện tại

- Config: `DATABASE_URL` bắt buộc; `HOST=0.0.0.0`, `PORT=3000` (1–65535), `NODE_ENV=development|production|test`. `TEST_DATABASE_URL` chỉ dành cho tests.
- Mỗi backend instance có pool tối đa 5 kết nối, connection timeout 2 giây, query/statement timeout 3 giây. Tính tổng pool theo số instances và chừa kết nối cho migration/health/administration.
- CORS và `trust proxy` mặc định tắt. Frontend sẽ gọi `/api` cùng origin. Không tin forwarded headers khi chưa xác định topology và giới hạn proxy đáng tin cậy.
- Log JSON ra stdout/stderr; không ghi log file, body, query string, SQL hoặc credentials. Lỗi hệ thống ghi category và Prisma code nếu có.
- `SIGTERM`/`SIGINT`: ngừng nhận kết nối mới, chờ request đang xử lý, đóng pool và thoát. Hạn shutdown 10 giây; hết hạn sẽ thoát lỗi. Ops cần đặt thời gian chờ lớn hơn giới hạn này.
- Backend không cần persistent filesystem hoặc quyền root; PostgreSQL cần volume persistent do bạn quản lý. Generated Client và `dist` là build artifacts.
- Có thể chạy nhiều backend instances vì không giữ state nghiệp vụ trong bộ nhớ; tất cả dùng chung PostgreSQL.
- Không có authentication, phân trang hoặc rate limiting trong phạm vi ứng dụng. Bất kỳ ai truy cập được API đều có thể sửa/xóa dữ liệu.
- Kiểm tra end-to-end và bộ tài liệu bàn giao đầy đủ thuộc Phase 4–5.

Tham khảo chính thức: [Prisma driver adapters](https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/database-drivers), [Express error handling](https://expressjs.com/en/guide/error-handling/).

## 7. Kết quả xác minh Phase 2

Đã thực hiện trên môi trường phát triển ngày 2026-10-26:

- `npm ci`: thành công; npm audit báo 0 vulnerabilities tại thời điểm cài.
- `npm run db:generate` và `prisma validate`: thành công.
- Migration SQL được sinh từ schema bằng `prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`.
- `npm test`: 54 tests pass, gồm kiểm tra tiến trình thật với SIGTERM/SIGINT và database không truy cập được.
- `npm run lint`, `npm run type-check`, `npm run build`: thành công.
- Chạy thử JavaScript đã build: liveness `200`, readiness `503` với database cố ý không truy cập được, SIGTERM thoát mã `0`.
- `npm run test:integration`: đã thử, thất bại ở bước kiểm tra cấu hình vì chưa có `TEST_DATABASE_URL`; chưa chạy các test case PostgreSQL.

Chưa xác minh migration trên database mới hoặc CRUD/lưu dữ liệu với PostgreSQL thật; cần bạn chuẩn bị database ở mục 2 và 4.
Chưa khởi chạy container, triển khai server hoặc thực hiện phần Ops.
Npm cảnh báo ESLint 9.39.5 đã hết hỗ trợ; nhánh này được giữ để tương thích Node 22.12. ESLint 10 yêu cầu tối thiểu Node 22.13 trên nhánh 22.

Sau khi tách thành repo độc lập `be`, đã cài lại dependencies, sinh lại Prisma Client và chạy lại: 54 tests pass, lint/type-check/build thành công.
Git metadata và origin cũ được chuyển từ thư mục cha sang `be`; chưa đổi remote hoặc push. Repo `fe` có Git riêng và chưa cấu hình remote.
