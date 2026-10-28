# Docker, GHCR và rollback

Các lệnh chạy từ repo `be`. Các lệnh Make bên dưới dùng Docker.
Xem [README](README.md) cho API và cách chạy npm trực tiếp trên host.

## Chạy bằng source local

Tạo `.env` từ `.env.example` nếu chưa có. Đặt `POSTGRES_PASSWORD` và
`DATABASE_URL` cùng credentials, database `testdb`, hostname `db`.
Percent-encode password trong URL nếu có ký tự đặc biệt. Không commit `.env`.

```sh
make up
make migrate-status
curl --fail http://localhost:3000/api/health/ready
curl --fail http://localhost:3000/api/todos
make test
make lint
make typecheck
```

`make up` chờ PostgreSQL healthy, chạy migration bằng service `migrate`,
sau đó build/start backend và chờ healthy. Runtime chỉ chứa JavaScript và
dependencies production. Tests/lint/type-check dùng service `tools` có source
và dependencies development; không chạy các lệnh này trong runtime container.

`make down` giữ volume database. Không dùng `down -v` nếu cần giữ dữ liệu.
Đổi `POSTGRES_PASSWORD` không tự đổi password của database đã có trong volume.

## Images trên GHCR

Sau khi Backend CI pass cho push vào `develop`, workflow publish checkout đúng
commit đã kiểm tra và xuất bản:

- `ghcr.io/tuql3/devopsbe:<full-commit-sha>`: runtime, user `node`.
- `ghcr.io/tuql3/devopsbe:<full-commit-sha>-migration`: schema, migrations và CLI.
- `ghcr.io/tuql3/devopsbe:develop`: tag tiện dụng có thể thay đổi.

Metadata lấy SHA từ Git checkout. Dùng SHA để release, giữ image của phiên bản
đang chạy và ít nhất một phiên bản trước; không xóa chúng khi dọn GHCR.
CI gates hiện tại là lint, type-check, unit/integration tests và build, cùng
required checks trên `develop`/`master`. SonarQube/Trivy thuộc bước tiếp theo.

## Chạy release từ registry

`compose.release.yaml` chạy frontend, backend, PostgreSQL và migration runner.
Các container dùng chung network; hostname `backend` khớp Nginx proxy `/api`.
Project mặc định `todo-release` có volume riêng, không dùng volume `be_pgdata`
của local development. PostgreSQL và backend không publish cổng ra host.

Tạo file từ mẫu nếu chưa có:

```sh
cp release.env.example release.env
```

Điền full SHA đã publish của cả hai repo, password riêng và `DATABASE_URL`
với user/database `todo`, hostname `db`. Không ghi đè file đã tồn tại.
`release.env` và `previous.env` được Git/Docker ignore vì chứa credentials.
Frontend mới dùng cổng nội bộ `8080`; với image cũ dùng cổng `80`, ghi
`FRONTEND_CONTAINER_PORT=80` trong file của chính release đó.

```sh
docker compose --env-file release.env -f compose.release.yaml config --quiet
docker compose --env-file release.env -f compose.release.yaml pull backend frontend migrate
docker compose --env-file release.env -f compose.release.yaml run --rm migrate
docker compose --env-file release.env -f compose.release.yaml up -d --wait backend frontend
curl --fail http://127.0.0.1:8080/
curl --fail http://127.0.0.1:8080/api/health/ready
curl --fail http://127.0.0.1:8080/api/todos
docker compose --env-file release.env -f compose.release.yaml images
```

Frontend chỉ mở ở loopback cổng `8080` mặc định; đổi `FRONTEND_PORT` khi cần.
Chạy smoke test CRUD trước khi xác nhận release thành công. Ghi lại hai SHA và
image digests, không build lại image khi chuyển sang môi trường khác.

## Nâng phiên bản và rollback

Trước khi sửa SHA của một release đang hoạt động:

```sh
cp release.env previous.env
```

Sửa hai SHA trong `release.env`, giữ nguyên cấu hình database, rồi chạy lại các
lệnh pull/migrate/up/smoke test ở trên. Không ghi đè `previous.env` bằng cấu hình
của release thất bại. Backup database trước migration có rủi ro; schema mới phải
tương thích với ứng dụng cũ nếu muốn rollback image.

Khi cần trở lại cặp image trước:

```sh
docker compose --env-file previous.env -f compose.release.yaml pull backend frontend
docker compose --env-file previous.env -f compose.release.yaml up -d --wait --no-build backend frontend
curl --fail http://127.0.0.1:8080/api/health/ready
curl --fail http://127.0.0.1:8080/api/todos
docker compose --env-file previous.env -f compose.release.yaml images
```

Kiểm tra CRUD và SHA/digest thực tế. Khi rollback đã pass, đồng bộ cấu hình hiện
tại bằng `cp previous.env release.env`. Các ví dụ curl dùng cổng host mặc định;
nếu đổi `FRONTEND_PORT`, dùng cổng tương ứng.

Rollback không chạy migration cũ và không rollback schema. Không reset database
hoặc xóa volume để giải quyết migration không tương thích; cần kế hoạch restore
database riêng. Giữ cặp image cũ trong GHCR cho đến khi hết thời hạn rollback.
