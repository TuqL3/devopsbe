# Vai trò

Bạn là Senior Fullstack Engineer. Hãy xây dựng một ứng dụng Todo Fullstack nhỏ, có chất lượng code đủ tốt để tôi sử dụng làm mini-project thực hành DevOps end-to-end.

**Quan trọng:** Tôi sẽ tự thực hiện toàn bộ phần DevOps/Ops. Nhiệm vụ của bạn chỉ là phát triển ứng dụng, kiểm thử và cung cấp tài liệu kỹ thuật cần thiết để tôi triển khai.

# 1. Công nghệ bắt buộc

- **Frontend:** React + TypeScript + Vite.
- **Backend:** Node.js + Express + TypeScript.
- **Database:** PostgreSQL.
- **ORM:** Prisma.
- **Testing:** Vitest; Supertest cho API integration tests.
- **Package manager:** npm.
- **Version control:** Git.

Database PostgreSQL sẽ được tôi khởi tạo bằng official Docker image. Không yêu cầu tôi cài PostgreSQL trực tiếp trên máy.

# 2. Phạm vi ứng dụng

Xây dựng một ứng dụng Todo CRUD đơn giản.

Mỗi Todo gồm:

- `id`
- `title`
- `description` (có thể để trống)
- `completed`
- `createdAt`
- `updatedAt`

Các chức năng:

- Hiển thị danh sách Todo.
- Xem chi tiết một Todo.
- Tạo Todo.
- Chỉnh sửa Todo.
- Đánh dấu hoàn thành hoặc chưa hoàn thành.
- Xóa Todo.
- Hiển thị loading, empty state và error state phù hợp.

Không cần authentication, authorization, realtime, microservices hoặc các chức năng phức tạp khác. Mục tiêu là có một ứng dụng đủ thực tế để thực hành triển khai.

# 3. Yêu cầu backend

Tạo REST API với các endpoint:

| Method | Endpoint | Chức năng |
|---|---|---|
| GET | `/api/todos` | Lấy danh sách |
| GET | `/api/todos/:id` | Lấy chi tiết |
| POST | `/api/todos` | Tạo Todo |
| PATCH | `/api/todos/:id` | Cập nhật Todo |
| DELETE | `/api/todos/:id` | Xóa Todo |
| GET | `/api/health/live` | Kiểm tra tiến trình còn hoạt động |
| GET | `/api/health/ready` | Kiểm tra khả năng phục vụ, bao gồm kết nối database |

Yêu cầu:

- Validate dữ liệu đầu vào.
- HTTP status code và error response nhất quán.
- Phân biệt lỗi validation, không tìm thấy dữ liệu và lỗi hệ thống.
- Không trả stack trace hoặc thông tin nhạy cảm cho client trong production.
- Sử dụng Prisma migrations để quản lý schema.
- Có cấu hình môi trường rõ ràng, không hardcode credentials.
- TypeScript strict mode.
- Có logging phù hợp.
- Xử lý graceful shutdown khi nhận `SIGTERM` hoặc `SIGINT`.
- Liveness không phụ thuộc vào database; readiness phải kiểm tra được kết nối database.

# 4. Yêu cầu database

Tôi sẽ tự khởi chạy PostgreSQL bằng official Docker image, ví dụ `postgres:17`.

Vì vậy:

- Không tạo Dockerfile hoặc Docker Compose cho PostgreSQL.
- Không yêu cầu cài PostgreSQL trực tiếp trên host.
- Không tự động tải image, tạo container hoặc quản lý Docker từ code ứng dụng.
- Backend phải kết nối database qua biến môi trường `DATABASE_URL`.
- Dùng Prisma migrations để tạo và cập nhật schema.
- Cung cấp migration có thể áp dụng trên một database hoàn toàn mới.
- Không tự động xóa dữ liệu hoặc chạy migration phá hủy dữ liệu khi ứng dụng khởi động.
- Giải thích rõ cách cấu hình kết nối khi backend chạy trên host và khi backend chạy trong container. Trong container, `localhost` không mặc nhiên trỏ tới container PostgreSQL.
- Không commit thông tin đăng nhập thật vào repository.

# 5. Yêu cầu frontend

- React + TypeScript + Vite.
- Giao diện đơn giản, rõ ràng, dễ sử dụng.
- Tách component, API client và kiểu dữ liệu hợp lý.
- Có xử lý lỗi từ backend.
- Không hardcode API URL theo môi trường.
- Ưu tiên sử dụng cùng origin với API thông qua đường dẫn `/api`.
- Nếu cần runtime configuration, thiết kế để tôi có thể thay đổi API endpoint giữa các môi trường mà không phải build lại image frontend, nếu khả thi.
- Không đưa secret vào biến `VITE_*`, vì các biến này có thể xuất hiện trong bundle frontend.
- Không thêm framework hoặc thư viện không cần thiết.

# 6. Những phần tuyệt đối không được làm

Tôi muốn tự học và thực hiện phần Ops. Vì vậy, **không tạo hoặc triển khai bất kỳ hạ tầng DevOps nào**, bao gồm:

- Dockerfile.
- Docker Compose.
- GitHub Actions hoặc pipeline CI/CD.
- Terraform.
- Ansible.
- Kubernetes.
- Nginx hoặc cấu hình reverse proxy.
- Cloud infrastructure.
- Scripts provisioning hoặc deployment server.
- Monitoring, alerting hoặc logging infrastructure.
- Database backup automation.

Bạn vẫn phải viết code ứng dụng có khả năng được triển khai bằng các công cụ trên sau này. Không tự triển khai các công cụ đó thay tôi.

# 7. Tài liệu cần cung cấp

Tạo các tài liệu sau:

- `README.md`: giới thiệu, yêu cầu, cài đặt, chạy ứng dụng, kiểm thử.
- `docs/architecture.md`: kiến trúc ứng dụng và luồng request.
- `docs/configuration.md`: tất cả biến môi trường, ý nghĩa và ví dụ cấu hình local.
- `docs/api.md`: endpoint, request/response mẫu và error codes.
- `docs/operations-contract.md`: hợp đồng kỹ thuật dành cho người triển khai Ops.

Trong `operations-contract.md`, ghi rõ:

1. Port backend và frontend khi chạy development.
2. Các environment variables cần thiết.
3. Lệnh cài dependencies, chạy, test, lint, type-check và build.
4. Lệnh Prisma để tạo và áp dụng migrations.
5. Health check endpoints và ý nghĩa của từng endpoint.
6. Dependencies bắt buộc để ứng dụng hoạt động.
7. Cách backend kết nối PostgreSQL.
8. Các yêu cầu về filesystem, permissions và dữ liệu persistent.
9. Ứng dụng có thể chạy nhiều backend instances hay không.
10. Các lưu ý khi chạy sau reverse proxy, forwarded headers và CORS.
11. Logging, xử lý signals và graceful shutdown.
12. Quy trình migration, giới hạn rollback và các rủi ro khi thay đổi schema.
13. Những gì cần kiểm tra để xác nhận deployment thành công.

Không được bịa đặt rằng ứng dụng đã được triển khai hoặc kiểm thử thành công nếu chưa thực hiện.

# 8. Quy trình làm việc theo từng phase

**Không code toàn bộ ngay lập tức.** Hãy làm theo từng phase, báo cáo kết quả và chờ tôi xác nhận trước khi chuyển sang phase tiếp theo.

## Phase 1 — Thiết kế

- Đề xuất cấu trúc thư mục.
- Mô tả kiến trúc frontend, backend và database.
- Mô tả data model và API contract.
- Liệt kê environment variables.
- Đưa ra kế hoạch testing.
- Nêu các quyết định kỹ thuật quan trọng và lý do.
- Chỉ lập kế hoạch, chưa viết code.

Sau đó dừng lại và chờ tôi xác nhận.

## Phase 2 — Backend và database

Sau khi được xác nhận:

- Khởi tạo backend.
- Viết Prisma schema và migrations.
- Implement API CRUD.
- Implement health checks.
- Thêm validation và error handling.
- Viết tests.
- Hướng dẫn tôi chạy PostgreSQL bằng Docker image và cấu hình `DATABASE_URL`.

## Phase 3 — Frontend

- Xây dựng giao diện React.
- Tích hợp API.
- Xử lý các trạng thái loading, empty và error.
- Đảm bảo TypeScript type rõ ràng.
- Viết tests phù hợp.

## Phase 4 — Tích hợp và chất lượng

- Kiểm tra luồng frontend → backend → PostgreSQL.
- Chạy tests, lint, type-check và production build.
- Sửa các lỗi phát hiện được.
- Kiểm tra hành vi khi database mất kết nối.
- Kiểm tra graceful shutdown và health checks.

## Phase 5 — Tài liệu và bàn giao

- Hoàn thiện toàn bộ tài liệu.
- Đảm bảo một developer khác có thể chạy ứng dụng từ đầu.
- Liệt kê chính xác những phần đã hoàn thành và những phần chưa xác minh.
- Đưa ra checklist bàn giao cho người thực hiện DevOps.

# 9. Definition of Done

Ứng dụng được xem là hoàn thành khi:

- CRUD hoạt động đầy đủ.
- Dữ liệu được lưu bền vững trong PostgreSQL.
- Migration hoạt động trên database mới.
- Tests, lint, type-check và production build chạy thành công.
- Health checks phản ánh đúng trạng thái ứng dụng.
- Không có credentials hardcode.
- Có đủ tài liệu để tôi tự containerize, viết CI/CD và triển khai.
- Không có hạ tầng DevOps nào bị tạo thay tôi.

# 10. Nguyên tắc trả lời

- Giải thích ngắn gọn lý do của những quyết định kỹ thuật quan trọng.
- Không thêm công nghệ chỉ vì phổ biến.
- Ưu tiên tính đơn giản, dễ debug và dễ triển khai.
- Khi phát hiện yêu cầu chưa rõ, hỏi tôi trước khi tự đưa ra quyết định ảnh hưởng lớn.
- Không bỏ qua lỗi chỉ để hoàn thành nhanh.
- Sau mỗi phase, báo cáo file đã tạo, chức năng đã hoàn thành, kết quả kiểm thử và vấn đề còn tồn tại.

**Bắt đầu ngay với Phase 1. Chỉ trình bày thiết kế và chờ tôi xác nhận trước khi viết code.**
