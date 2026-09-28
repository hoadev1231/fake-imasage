# fake-imasage
fake-imasage là ứng dụng Node.js chạy cục bộ để dựng và tùy chỉnh ảnh chụp hội thoại kiểu iPhone.

## Chạy ứng dụng

Yêu cầu Node.js 18 trở lên.

```bash
npm start
```

Mở `http://localhost:3000` trên máy tính hoặc điện thoại cùng mạng. Để mở từ điện thoại, thay `localhost` bằng địa chỉ IP nội bộ của máy đang chạy server.

## Sử dụng

- Hội thoại mặc định hiển thị avatar trống và số điện thoại theo dạng `+84 XX XXXXXXX`; chọn **Tùy chỉnh** để nhập số và đổi thanh trạng thái.
- Phần trăm pin được hiển thị cạnh biểu tượng pin trong bản xem trước.
- Soạn tin rồi nhấn nút gửi hoặc dấu **+**, sau đó chọn người gửi và giờ trong hộp thoại.
- Nhấn trực tiếp vào bong bóng tin nhắn để sửa nội dung, thời gian, người gửi hoặc xóa tin.
- Trên mobile, vuốt tin nhắn sang trái để xóa; trên PC, dùng **Xóa tất cả tin nhắn** trong bảng công cụ.
- Sau khi xóa, nhấn **Khôi phục tin nhắn mới xóa** để hoàn tác.
- Trên mobile, nhấn **Tạo** để mở trang kết quả; trên PC, nhấn **Tạo** để ẩn thao tác sửa.

Ứng dụng chỉ dựng giao diện mô phỏng trong trình duyệt; không gửi SMS hoặc iMessage thật.
