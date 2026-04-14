
Tracking_Base_System là hệ thống trung tâm để nhận event tracking, lưu 1 bản chuẩn, rồi đẩy sang Meta/Google/TikTok.

Flow rất ngắn:

App/web khác gửi event vào POST /track.
API kiểm tra dữ liệu, tạo/giữ event_id, chống trùng.
Event được lưu vào DB làm nguồn dữ liệu chuẩn.
Job được đưa vào hàng đợi.
Worker lấy job, gửi sang các nền tảng đích, cập nhật trạng thái queued/success/failed.
Frontend console dùng để xem event, lọc, xem chi tiết, và replay event lỗi.