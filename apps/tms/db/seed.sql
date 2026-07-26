-- ── Branches ────────────────────────────────────────────────────────────────
INSERT INTO branches (id, name, city, region, status) VALUES
('branch-hcm', 'Ho Chi Minh City Branch', 'Ho Chi Minh City', 'South', 'Active'),
('branch-hn',  'Ha Noi Branch',           'Ha Noi',           'North', 'Active'),
('branch-dn',  'Da Nang Branch',          'Da Nang',          'Central', 'Active');

-- ── Roles ────────────────────────────────────────────────────────────────────
INSERT INTO roles (id, name, description) VALUES
('role-admin',         'admin',         'Full system access'),
('role-fleet-manager', 'fleet_manager', 'Fleet and driver management'),
('role-dispatcher',    'dispatcher',    'Trip scheduling and dispatch'),
('role-mechanic',      'mechanic',      'Maintenance and service records');

-- ── Permissions ──────────────────────────────────────────────────────────────
-- admin
INSERT INTO permissions (id, role_id, permission_key) VALUES
('perm-adm-01', 'role-admin', 'fleet.read'),
('perm-adm-02', 'role-admin', 'fleet.write'),
('perm-adm-03', 'role-admin', 'drivers.read'),
('perm-adm-04', 'role-admin', 'drivers.write'),
('perm-adm-05', 'role-admin', 'trips.read'),
('perm-adm-06', 'role-admin', 'trips.write'),
('perm-adm-07', 'role-admin', 'maintenance.read'),
('perm-adm-08', 'role-admin', 'maintenance.write'),
('perm-adm-09', 'role-admin', 'reports.read'),
('perm-adm-10', 'role-admin', 'reports.financials'),
('perm-adm-11', 'role-admin', 'settings.read'),
('perm-adm-12', 'role-admin', 'settings.write'),
('perm-adm-13', 'role-admin', 'crm.read'),
('perm-adm-14', 'role-admin', 'crm.write'),
('perm-adm-15', 'role-admin', 'orders.read'),
('perm-adm-16', 'role-admin', 'orders.write'),
('perm-adm-17', 'role-admin', 'catalog.read'),
('perm-adm-18', 'role-admin', 'catalog.write'),
('perm-adm-19', 'role-admin', 'accounting.read'),
('perm-adm-20', 'role-admin', 'accounting.write');

-- fleet_manager
INSERT INTO permissions (id, role_id, permission_key) VALUES
('perm-fm-01', 'role-fleet-manager', 'fleet.read'),
('perm-fm-02', 'role-fleet-manager', 'fleet.write'),
('perm-fm-03', 'role-fleet-manager', 'drivers.read'),
('perm-fm-04', 'role-fleet-manager', 'drivers.write'),
('perm-fm-05', 'role-fleet-manager', 'maintenance.read'),
('perm-fm-06', 'role-fleet-manager', 'maintenance.write'),
('perm-fm-07', 'role-fleet-manager', 'reports.read');

-- dispatcher
INSERT INTO permissions (id, role_id, permission_key) VALUES
('perm-dp-01', 'role-dispatcher', 'trips.read'),
('perm-dp-02', 'role-dispatcher', 'trips.write'),
('perm-dp-03', 'role-dispatcher', 'fleet.read'),
('perm-dp-04', 'role-dispatcher', 'drivers.read'),
('perm-dp-05', 'role-dispatcher', 'orders.read'),
('perm-dp-06', 'role-dispatcher', 'orders.write');

-- mechanic
INSERT INTO permissions (id, role_id, permission_key) VALUES
('perm-mc-01', 'role-mechanic', 'maintenance.read'),
('perm-mc-02', 'role-mechanic', 'maintenance.write'),
('perm-mc-03', 'role-mechanic', 'fleet.read');

-- ── Users ────────────────────────────────────────────────────────────────────
-- password_hash stored as plaintext; server detects and upgrades on first login
INSERT INTO users (id, email, name, password_hash, preferred_lang) VALUES
('user-admin', 'admin@tms.local',  'Admin User',     'admin123', 'en'),
('user-fleet', 'fleet@tms.local',  'Fleet Manager',  'fleet123', 'vi'),
('user-disp',  'disp@tms.local',   'Dispatcher One', 'disp123',  'en');

-- ── Customers ──────────────────────────────────────────────────────────────
INSERT INTO customers (id, code, name, tax_code, phone, email, stage, owner_name, visibility, status) VALUES
('customer-01', 'KH001', 'Công ty CP Nhựa Bình Minh', '0312234578', '028-3810-1234', 'logistics@binhminh.vn', 'Customer', 'Lê Hoàng Nam', 'Public', 'Active'),
('customer-02', 'KH002', 'Công ty CP Xuất nhập khẩu Sài Gòn Logistics', '0302234568', '028-3822-4567', 'ops@sglogistics.vn', 'Customer', 'Phạm Thị Thu Hà', 'Private', 'Active'),
('customer-03', 'KH003', 'Công ty TNHH Thương mại Minh Phát', '0301234567', '028-3930-9898', 'contact@minhphat.vn', 'Contacting', 'Lê Hoàng Nam', 'Private', 'Active'),
('customer-04', 'KH004', 'Công ty TNHH Giày da Pou Yuen', '0309234575', '0274-388-0101', 'shipping@pouyuen.vn', 'Contacting', 'Vũ Minh Quân', 'Public', 'Active'),
('customer-05', 'KH005', 'Công ty CP Dầu thực vật Tường An', '0326234592', '028-3822-4545', 'procurement@tuongan.vn', 'Lead', 'Bùi Thị Kim Chi', 'Public', 'Active'),
('customer-06', 'KH006', 'Công ty TNHH Hóa chất Đông Á', '0311234577', '028-3772-6464', 'sale@hoachatdonga.vn', 'Lead', 'Hoàng Việt Anh', 'Private', 'Inactive');

-- ── Partners ───────────────────────────────────────────────────────────────
INSERT INTO partners (id, code, name, tax_code, phone, email, partner_type, owner_name, visibility, status) VALUES
('partner-01', 'NX001', 'Công ty Vận tải Thành Đạt', '0310876543', '028-3822-0988', 'ops@thanhdat.vn', 'Carrier', 'Phạm Thị Thu Hà', 'Public', 'Active'),
('partner-02', 'NCC001', 'Công ty TNHH ForwardX', '0318875081', '028-3778-0101', 'contact@forwardx.vn', 'Supplier', 'Lê Hoàng Nam', 'Private', 'Active'),
('partner-03', 'HT001', 'Maersk Việt Nam', '0380567890', '028-3911-2000', 'booking@maersk.vn', 'ShippingLine', 'Vũ Minh Quân', 'Public', 'Active'),
('partner-04', 'KB001', 'Kho hàng không Tân Sơn Nhất', '0307234573', '028-3844-0102', 'warehouse@tcs.vn', 'Warehouse', 'Bùi Thị Kim Chi', 'Public', 'Active'),
('partner-05', 'DP001', 'Depot Tân Thuận', '0312234599', '028-3771-0202', 'yard@tantuan.vn', 'Depot', 'Hoàng Việt Anh', 'Private', 'Active'),
('partner-06', 'NCC002', 'Công ty CP Dịch vụ Cảng Sài Gòn', '0316234567', '028-3829-1000', 'sales@saigonport.vn', 'Supplier', 'Phạm Thị Thu Hà', 'Public', 'Inactive');

-- ── User Roles ────────────────────────────────────────────────────────────────
INSERT INTO user_roles (user_id, role_id) VALUES
('user-admin', 'role-admin'),
('user-fleet', 'role-fleet-manager'),
('user-disp',  'role-dispatcher');

-- ── Drivers ──────────────────────────────────────────────────────────────────
INSERT INTO drivers (id, name, phone, email, license_number, license_expiry, status, assigned_truck_id) VALUES
('driver-01', 'Nguyen Van An',    '+84-901-001-001', 'nguyen.an@tms.local',    'VN-DL-001001', '2027-06-30', 'Active',    'truck-01'),
('driver-02', 'Tran Thi Bich',   '+84-901-001-002', 'tran.bich@tms.local',    'VN-DL-001002', '2026-12-31', 'Active',    'truck-02'),
('driver-03', 'Le Van Cuong',    '+84-901-001-003', 'le.cuong@tms.local',     'VN-DL-001003', '2027-03-15', 'Active',    'truck-03'),
('driver-04', 'Pham Thi Dung',   '+84-901-001-004', 'pham.dung@tms.local',    'VN-DL-001004', '2027-09-20', 'Active',    'truck-04'),
('driver-05', 'Hoang Van Em',    '+84-901-001-005', 'hoang.em@tms.local',     'VN-DL-001005', '2026-08-15', 'Active',    'truck-05'),
('driver-06', 'Dang Thi Phuong', '+84-901-001-006', 'dang.phuong@tms.local',  'VN-DL-001006', '2025-11-30', 'On Leave',  NULL),
('driver-07', 'Bui Van Giang',   '+84-901-001-007', 'bui.giang@tms.local',    'VN-DL-001007', '2027-04-25', 'Active',    'truck-07'),
('driver-08', 'Ngo Thi Huong',   '+84-901-001-008', 'ngo.huong@tms.local',    'VN-DL-001008', '2026-07-10', 'Active',    'truck-08'),
('driver-09', 'Do Van Khanh',    '+84-901-001-009', 'do.khanh@tms.local',     'VN-DL-001009', '2027-01-18', 'Active',    'truck-09'),
('driver-10', 'Vo Thi Lan',      '+84-901-001-010', 'vo.lan@tms.local',       'VN-DL-001010', '2025-09-05', 'Suspended', 'truck-10');

-- ── Trucks ────────────────────────────────────────────────────────────────────
INSERT INTO trucks (id, plate, model, type, status, capacity_kg, mileage, driver_id, last_service, next_service, branch_id, notes) VALUES
('truck-01', 'CA-101-ABC', 'Freightliner Cascadia', 'Semi',         'Active',         20000, 125400, 'driver-01', '2026-07-01', '2026-08-15', 'branch-hcm', NULL),
('truck-02', 'CA-102-DEF', 'Kenworth T680',         'Semi',         'Maintenance',    20000,  98200, 'driver-02', '2026-06-15', '2026-07-15', 'branch-hcm', 'Oil leak repair in progress'),
('truck-03', 'TX-201-GHI', 'Peterbilt 579',         'Semi',         'Active',         22000, 210500, 'driver-03', '2026-07-10', '2026-08-10', 'branch-hn',  NULL),
('truck-04', 'FL-301-JKL', 'Isuzu NPR',             'Box Truck',    'Active',          5000,  45800, 'driver-04', '2026-06-20', '2026-08-20', 'branch-dn',  NULL),
('truck-05', 'TX-202-MNO', 'International LT',      'Semi',         'Out of Service', 20000, 320100, 'driver-05', '2026-05-01', '2026-07-01', 'branch-hn',  'Engine failure, awaiting parts'),
('truck-06', 'CA-103-PQR', 'Ford Transit',           'Box Truck',    'Active',          1500,  28400, NULL,        '2026-07-05', '2026-09-05', 'branch-hcm', NULL),
('truck-07', 'IL-401-STU', 'Mack Anthem',            'Flatbed',      'Active',         18000, 185200, 'driver-07', '2026-06-28', '2026-07-28', 'branch-hcm', NULL),
('truck-08', 'WA-501-VWX', 'Volvo VNL',             'Semi',         'Maintenance',    22000, 156700, 'driver-08', '2026-07-08', '2026-08-08', 'branch-dn',  'Scheduled brake overhaul'),
('truck-09', 'CA-104-YZA', 'Kenworth T880',          'Flatbed',      'Active',         17000, 234800, 'driver-09', '2026-06-30', '2026-07-30', 'branch-hn',  NULL),
('truck-10', 'FL-302-BCD', 'Freightliner M2',        'Box Truck',    'Active',          6500,  67200, 'driver-10', '2026-07-12', '2026-09-12', 'branch-dn',  NULL),
('truck-11', 'IL-402-EFG', 'Western Star 5700',      'Semi',         'Out of Service', 20000, 412000, NULL,        '2026-04-15', '2026-06-15', 'branch-hn',  'Decommissioned — awaiting disposal'),
('truck-12', 'WA-502-HIJ', 'Peterbilt 567',          'Flatbed',      'Active',         18000, 142300, NULL,        '2026-07-03', '2026-08-03', 'branch-hcm', NULL);

-- ── Trips ────────────────────────────────────────────────────────────────────
INSERT INTO trips (id, trip_number, truck_id, driver_id, origin, destination, status, departure_time, arrival_time, distance_km, cargo_type, cargo_weight, notes) VALUES
('trip-01',  'TRP-001', 'truck-01', 'driver-01', 'Ho Chi Minh City', 'Ha Noi',           'Completed',  '2026-07-10 06:00:00', '2026-07-11 18:00:00', 1726.50, 'Electronics',    18500.00, 'Delivered on time'),
('trip-02',  'TRP-002', 'truck-03', 'driver-03', 'Ha Noi',           'Da Nang',          'Completed',  '2026-07-12 07:00:00', '2026-07-12 22:00:00',  764.00, 'Machinery',      22000.00, NULL),
('trip-03',  'TRP-003', 'truck-04', 'driver-04', 'Da Nang',          'Ho Chi Minh City', 'Completed',  '2026-07-14 05:30:00', '2026-07-14 23:00:00',  964.00, 'Consumer Goods', 12000.00, NULL),
('trip-04',  'TRP-004', 'truck-07', 'driver-07', 'Ho Chi Minh City', 'Hai Phong',        'In Transit', '2026-07-24 08:00:00', NULL,                   1845.00, 'Steel Coils',    25000.00, 'On schedule'),
('trip-05',  'TRP-005', 'truck-09', 'driver-09', 'Ha Noi',           'Can Tho',          'In Transit', '2026-07-24 06:30:00', NULL,                   1950.00, 'Agricultural',   20000.00, NULL),
('trip-06',  'TRP-006', 'truck-10', 'driver-10', 'Ho Chi Minh City', 'Hue',              'In Transit', '2026-07-25 04:00:00', NULL,                   1083.00, 'Textiles',        9500.00, NULL),
('trip-07',  'TRP-007', 'truck-01', 'driver-01', 'Ho Chi Minh City', 'Da Nang',          'Scheduled',  '2026-07-28 06:00:00', NULL,                    964.00, 'Electronics',    15000.00, NULL),
('trip-08',  'TRP-008', 'truck-03', 'driver-03', 'Ha Noi',           'Ho Chi Minh City', 'Scheduled',  '2026-07-29 07:00:00', NULL,                   1726.50, 'Auto Parts',     18000.00, NULL),
('trip-09',  'TRP-009', 'truck-12', NULL,         'Da Nang',          'Bien Hoa',         'Scheduled',  '2026-07-30 08:00:00', NULL,                    925.00, 'Plastics',       10500.00, 'Driver to be assigned'),
('trip-10',  'TRP-010', 'truck-04', 'driver-04', 'Can Tho',          'Ha Noi',           'Scheduled',  '2026-07-31 05:00:00', NULL,                   1985.00, 'Food & Beverage', 8000.00, NULL),
('trip-11',  'TRP-011', 'truck-06', NULL,         'Ho Chi Minh City', 'Nha Trang',        'Cancelled',  '2026-07-18 07:00:00', NULL,                    447.00, 'Garments',        6000.00, 'Client cancelled order'),
('trip-12',  'TRP-012', 'truck-05', 'driver-05', 'Ha Noi',           'Ho Chi Minh City', 'Cancelled',  '2026-07-20 06:00:00', NULL,                   1726.50, 'Furniture',      14000.00, 'Vehicle breakdown'),
('trip-13',  'TRP-013', 'truck-02', 'driver-02', 'Ho Chi Minh City', 'Da Nang',          'Completed',  '2026-07-05 06:00:00', '2026-07-05 22:30:00',   964.00, 'Chemicals',      11000.00, NULL),
('trip-14',  'TRP-014', 'truck-08', 'driver-08', 'Ha Noi',           'Hai Phong',        'Completed',  '2026-07-08 08:00:00', '2026-07-08 11:30:00',   121.00, 'Seafood',         5500.00, 'Refrigerated cargo'),
('trip-15',  'TRP-015', 'truck-09', 'driver-09', 'Can Tho',          'Ho Chi Minh City', 'In Transit', '2026-07-25 10:00:00', NULL,                    178.00, 'Rice',           21000.00, NULL);

-- ── Orders ──────────────────────────────────────────────────────────────────
INSERT INTO orders (id, order_number, customer_name, customer_legal_name, order_date, status, shipment_type, route, transport_method, trip_count, total_amount, created_by, notes) VALUES
('order-01', 'DH-2026-0001', 'Công ty TNHH Minh Long', 'Minh Long Logistics Co., Ltd.', '2026-07-25', 'Draft', 'Hàng lẻ', 'Hồ Chí Minh → Đà Nẵng', 'Đường bộ', 0, 18500000, 'Admin User', 'Chờ xác nhận khối lượng'),
('order-02', 'DH-2026-0002', 'Công ty CP Đại Phát', 'Dai Phat JSC', '2026-07-25', 'Draft', 'Nguyên chuyến', 'Hà Nội → Hải Phòng', 'Đường bộ', 0, 12600000, 'Admin User', NULL),
('order-03', 'DH-2026-0003', 'Công ty Thực phẩm An Bình', 'An Binh Foods', '2026-07-24', 'Draft', 'Hàng lạnh', 'Cần Thơ → Hồ Chí Minh', 'Đường bộ', 0, 21800000, 'Admin User', NULL),
('order-04', 'DH-2026-0004', 'Công ty CP Hưng Thịnh', 'Hung Thinh Trading JSC', '2026-07-24', 'Pending Approval', 'Hàng lẻ', 'Hồ Chí Minh → Nha Trang', 'Đường bộ', 1, 14200000, 'Admin User', 'Đang chờ duyệt giá'),
('order-05', 'DH-2026-0005', 'Công ty TNHH Sản xuất Việt', 'Viet Manufacturing Co., Ltd.', '2026-07-23', 'Pending Approval', 'Nguyên chuyến', 'Hà Nội → Đà Nẵng', 'Đường bộ', 1, 32600000, 'Admin User', NULL),
('order-06', 'DH-2026-0006', 'Công ty CP Xuất nhập khẩu Sao', 'Sao Import Export JSC', '2026-07-23', 'Pending Approval', 'Container', 'Hải Phòng → Hà Nội', 'Đường bộ', 1, 17400000, 'Admin User', NULL),
('order-07', 'DH-2026-0007', 'Công ty TNHH Nam Việt', 'Nam Viet Co., Ltd.', '2026-07-22', 'Approved', 'Nguyên chuyến', 'Hồ Chí Minh → Hà Nội', 'Đường bộ', 2, 48600000, 'Admin User', NULL),
('order-08', 'DH-2026-0008', 'Công ty CP May Thành Công', 'Thanh Cong Garment JSC', '2026-07-22', 'Approved', 'Hàng lẻ', 'Đà Nẵng → Huế', 'Đường bộ', 1, 9200000, 'Admin User', NULL),
('order-09', 'DH-2026-0009', 'Công ty TNHH Điện tử Đông Á', 'Dong A Electronics Co., Ltd.', '2026-07-21', 'Approved', 'Hàng lẻ', 'Hồ Chí Minh → Biên Hòa', 'Đường bộ', 1, 11800000, 'Admin User', NULL),
('order-10', 'DH-2026-0010', 'Công ty CP Nông sản Miền Tây', 'Mien Tay Agriculture JSC', '2026-07-20', 'Approved', 'Hàng lạnh', 'Cần Thơ → Hà Nội', 'Đường bộ', 2, 59300000, 'Admin User', NULL),
('order-11', 'DH-2026-0011', 'Công ty TNHH Gia Phúc', 'Gia Phuc Co., Ltd.', '2026-07-20', 'Cancelled', 'Hàng lẻ', 'Hồ Chí Minh → Vũng Tàu', 'Đường bộ', 0, 7600000, 'Admin User', 'Khách hàng hủy đơn'),
('order-12', 'DH-2026-0012', 'Công ty CP Phú Mỹ', 'Phu My JSC', '2026-07-19', 'Cancelled', 'Nguyên chuyến', 'Đà Nẵng → Quy Nhơn', 'Đường bộ', 0, 16800000, 'Admin User', 'Không đủ phương tiện');

-- ── Catalog master data ─────────────────────────────────────────────────────
INSERT INTO master_data (id, kind, code, name, description, symbol, decimals, status, sort_order) VALUES
('catalog-ct-01', 'container_type', '20GP', 'Container khô 20 feet', 'Container bách hóa tiêu chuẩn 20 feet', NULL, NULL, 'Active', 10),
('catalog-ct-02', 'container_type', '40GP', 'Container khô 40 feet', 'Container bách hóa tiêu chuẩn 40 feet', NULL, NULL, 'Active', 20),
('catalog-ct-03', 'container_type', '40HC', 'Container cao 40 feet', 'Container high-cube 40 feet', NULL, NULL, 'Active', 30),
('catalog-vt-01', 'vehicle_type', 'SEMI', 'Đầu kéo', 'Xe đầu kéo container', NULL, NULL, 'Active', 10),
('catalog-vt-02', 'vehicle_type', 'BOX', 'Xe thùng', 'Xe tải thùng kín', NULL, NULL, 'Active', 20),
('catalog-vt-03', 'vehicle_type', 'FLATBED', 'Xe sàn', 'Xe tải sàn chở hàng cồng kềnh', NULL, NULL, 'Active', 30),
('catalog-unit-01', 'unit', 'KG', 'Kilogram', 'Đơn vị khối lượng', NULL, NULL, 'Active', 10),
('catalog-unit-02', 'unit', 'TON', 'Tấn', 'Một nghìn kilogram', NULL, NULL, 'Active', 20),
('catalog-unit-03', 'unit', 'CBM', 'Mét khối', 'Đơn vị thể tích', NULL, NULL, 'Active', 30),
('catalog-cargo-01', 'cargo_type', 'GENERAL', 'Hàng tổng hợp', 'Hàng bách hóa thông thường', NULL, NULL, 'Active', 10),
('catalog-cargo-02', 'cargo_type', 'REEFER', 'Hàng lạnh', 'Hàng cần kiểm soát nhiệt độ', NULL, NULL, 'Active', 20),
('catalog-cargo-03', 'cargo_type', 'HAZMAT', 'Hàng nguy hiểm', 'Yêu cầu quy trình vận chuyển riêng', NULL, NULL, 'Active', 30),
('catalog-fee-01', 'fee_type', 'FREIGHT', 'Cước vận chuyển', 'Phí vận chuyển cơ bản', NULL, NULL, 'Active', 10),
('catalog-fee-02', 'fee_type', 'LOADING', 'Phí bốc xếp', 'Phí bốc dỡ hàng hóa', NULL, NULL, 'Active', 20),
('catalog-fee-03', 'fee_type', 'WAITING', 'Phí chờ', 'Phí chờ xe hoặc hàng', NULL, NULL, 'Active', 30),
('catalog-currency-01', 'currency', 'VND', 'Việt Nam đồng', 'Đồng tiền hạch toán mặc định', '₫', 0, 'Active', 10),
('catalog-currency-02', 'currency', 'USD', 'Đô la Mỹ', 'United States dollar', '$', 2, 'Active', 20),
('catalog-currency-03', 'currency', 'EUR', 'Euro', 'European euro', '€', 2, 'Active', 30);

-- ── Accounting records ──────────────────────────────────────────────────────
INSERT INTO accounting_entries (id, kind, code, name, counterparty, amount, currency, status, document_date, due_date, description, sort_order) VALUES
('acct-debit-01', 'debit_note', 'GBN-0001', 'Cước vận chuyển tháng 7', 'Công ty CP Đại Phát', 32600000, 'VND', 'Draft', '2026-07-24', '2026-08-05', 'Đối soát tuyến Hà Nội - Đà Nẵng', 10),
('acct-debit-02', 'debit_note', 'GBN-0002', 'Phụ phí giao hàng', 'Công ty TNHH Minh Long', 8400000, 'VND', 'Pending Approval', '2026-07-23', '2026-08-03', 'Phụ phí giao hàng Nha Trang', 20),
('acct-debit-03', 'debit_note', 'GBN-0003', 'Cước container', 'Công ty CP Xuất nhập khẩu Sao', 17400000, 'VND', 'Approved', '2026-07-20', '2026-07-30', 'Cước vận chuyển container', 30),
('acct-pay-01', 'payment_request', 'DNC-0001', 'Thanh toán dầu diesel', 'Petrolimex Sài Gòn', 12800000, 'VND', 'Pending Approval', '2026-07-25', '2026-07-28', 'Chi phí nhiên liệu tuần 30', 10),
('acct-pay-02', 'payment_request', 'DNC-0002', 'Thanh toán phí cầu đường', 'VETC', 6300000, 'VND', 'Approved', '2026-07-23', '2026-07-27', 'Phí ETC tháng 7', 20),
('acct-pay-03', 'payment_request', 'DNC-0003', 'Thanh toán sửa chữa xe', 'Garage Hưng Phát', 9200000, 'VND', 'Draft', '2026-07-22', '2026-07-29', 'Bảo dưỡng xe đầu kéo', 30),
('acct-advance-01', 'advance', 'TU-0001', 'Tạm ứng công tác', 'Nguyễn Văn An', 5000000, 'VND', 'Approved', '2026-07-24', '2026-07-31', 'Tạm ứng chuyến công tác Hà Nội', 10),
('acct-advance-02', 'advance', 'TU-0002', 'Tạm ứng chi phí chuyến', 'Trần Thị Bích', 7500000, 'VND', 'Draft', '2026-07-25', '2026-08-01', 'Chi phí giao hàng liên tỉnh', 20),
('acct-settle-01', 'settlement', 'HU-0001', 'Hoàn ứng công tác', 'Nguyễn Văn An', 1200000, 'VND', 'Approved', '2026-07-25', NULL, 'Hoàn lại phần tạm ứng chưa sử dụng', 10),
('acct-settle-02', 'settlement', 'HU-0002', 'Quyết toán chuyến xe', 'Trần Thị Bích', 6800000, 'VND', 'Pending Approval', '2026-07-24', NULL, 'Quyết toán chi phí chuyến xe', 20),
('acct-invoice-01', 'invoice_template', 'HD-DV', 'Hóa đơn dịch vụ vận chuyển', NULL, 0, 'VND', 'Active', NULL, NULL, 'Mẫu hóa đơn dịch vụ vận tải nội địa', 10),
('acct-invoice-02', 'invoice_template', 'HD-CN', 'Hóa đơn cước container', NULL, 0, 'VND', 'Active', NULL, NULL, 'Mẫu hóa đơn cho dịch vụ container', 20),
('acct-ledger-01', 'ledger_account', '111', 'Tiền mặt', NULL, 0, 'VND', 'Active', NULL, NULL, 'Tài khoản tiền mặt', 10),
('acct-ledger-02', 'ledger_account', '112', 'Tiền gửi ngân hàng', NULL, 0, 'VND', 'Active', NULL, NULL, 'Tài khoản tiền gửi ngân hàng', 20),
('acct-ledger-03', 'ledger_account', '131', 'Phải thu khách hàng', NULL, 0, 'VND', 'Active', NULL, NULL, 'Công nợ phải thu', 30);

-- ── Maintenance ───────────────────────────────────────────────────────────────
INSERT INTO maintenance (id, truck_id, service_type, status, scheduled_date, completed_date, technician_id, cost, notes) VALUES
('maint-01', 'truck-02', 'Oil Change',            'Completed',   '2026-06-15', '2026-06-15', 'user-admin', 850000.00,  'Full synthetic 15W-40'),
('maint-02', 'truck-05', 'Brake Inspection',      'Overdue',     '2026-06-01', NULL,         NULL,          NULL,       'Critical — truck out of service'),
('maint-03', 'truck-07', 'Tire Rotation',         'In Progress', '2026-07-20', NULL,         'user-admin', NULL,       '6 tires rotated, 2 flagged for replacement'),
('maint-04', 'truck-08', 'Transmission Service',  'Scheduled',   '2026-07-26', NULL,         NULL,          NULL,       'Full transmission fluid flush'),
('maint-05', 'truck-11', 'Engine Tune-Up',        'Overdue',     '2026-06-15', NULL,         NULL,          NULL,       'Vehicle decommissioned, service cancelled'),
('maint-06', 'truck-01', 'Oil Change',            'Scheduled',   '2026-08-15', NULL,         NULL,          NULL,       'Routine 10,000 km service'),
('maint-07', 'truck-03', 'Brake Inspection',      'Completed',   '2026-07-10', '2026-07-10', 'user-admin', 1200000.00, 'Brake pads replaced front and rear'),
('maint-08', 'truck-04', 'Tire Rotation',         'Scheduled',   '2026-08-20', NULL,         NULL,          NULL,       'Routine rotation — all 4 tires');

-- ── Notifications ─────────────────────────────────────────────────────────────
INSERT INTO notifications (id, user_id, type, title, body, read) VALUES
('notif-01', 'user-admin', 'alert',   'Service Overdue',          'Trucks TX-202-MNO and IL-402-EFG have passed their service due dates.',  false),
('notif-02', 'user-admin', 'warning', 'License Expiring Soon',    'Driver Vo Thi Lan''s license expires in 30 days. Please renew.',         false),
('notif-03', 'user-admin', 'info',    'Trip TRP-004 Departed',    'Truck IL-401-STU departed Ho Chi Minh City at 08:00 on schedule.',       true),
('notif-04', 'user-admin', 'success', 'Trip TRP-001 Completed',   'Truck CA-101-ABC arrived Ha Noi successfully. Cargo delivered.',         true),
('notif-05', 'user-admin', 'warning', 'Maintenance Due Next Week', '3 vehicles have scheduled maintenance within the next 7 days.',         false);

-- ── Translations ─────────────────────────────────────────────────────────────
-- Global / navigation (page='*')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', '*', NULL, 'Fleet',            'Fleet'),
('vi', '*', NULL, 'Fleet',            'Đội xe'),
('en', '*', NULL, 'Drivers',          'Drivers'),
('vi', '*', NULL, 'Drivers',          'Tài xế'),
('en', '*', NULL, 'Trips',            'Trips'),
('vi', '*', NULL, 'Trips',            'Chuyến xe'),
('en', '*', NULL, 'Maintenance',      'Maintenance'),
('vi', '*', NULL, 'Maintenance',      'Bảo dưỡng'),
('en', '*', NULL, 'Reports',          'Reports'),
('vi', '*', NULL, 'Reports',          'Báo cáo'),
('en', '*', NULL, 'Settings',         'Settings'),
('vi', '*', NULL, 'Settings',         'Cài đặt'),
('en', '*', NULL, 'Active',           'Active'),
('vi', '*', NULL, 'Active',           'Đang hoạt động'),
('en', '*', NULL, 'Inactive',         'Inactive'),
('vi', '*', NULL, 'Inactive',         'Ngừng hoạt động'),
('en', '*', NULL, 'Scheduled',        'Scheduled'),
('vi', '*', NULL, 'Scheduled',        'Đã lên lịch'),
('en', '*', NULL, 'In Transit',       'In Transit'),
('vi', '*', NULL, 'In Transit',       'Đang vận chuyển'),
('en', '*', NULL, 'Completed',        'Completed'),
('vi', '*', NULL, 'Completed',        'Hoàn thành'),
('en', '*', NULL, 'Cancelled',        'Cancelled'),
('vi', '*', NULL, 'Cancelled',        'Đã hủy'),
('en', '*', NULL, 'Out of Service',   'Out of Service'),
('vi', '*', NULL, 'Out of Service',   'Ngừng hoạt động'),
('en', '*', NULL, 'On Leave',         'On Leave'),
('vi', '*', NULL, 'On Leave',         'Nghỉ phép'),
('en', '*', NULL, 'Suspended',        'Suspended'),
('vi', '*', NULL, 'Suspended',        'Bị đình chỉ'),
('en', '*', NULL, 'In Progress',      'In Progress'),
('vi', '*', NULL, 'In Progress',      'Đang thực hiện'),
('en', '*', NULL, 'Overdue',          'Overdue'),
('vi', '*', NULL, 'Overdue',          'Quá hạn'),
('en', '*', NULL, 'Sign in',          'Sign in'),
('vi', '*', NULL, 'Sign in',          'Đăng nhập'),
('en', '*', NULL, 'Sign out',         'Sign out'),
('vi', '*', NULL, 'Sign out',         'Đăng xuất'),
('en', '*', NULL, 'Add',              'Add'),
('vi', '*', NULL, 'Add',              'Thêm mới'),
('en', '*', NULL, 'Edit',             'Edit'),
('vi', '*', NULL, 'Edit',             'Chỉnh sửa'),
('en', '*', NULL, 'Delete',           'Delete'),
('vi', '*', NULL, 'Delete',           'Xóa'),
('en', '*', NULL, 'Save',             'Save'),
('vi', '*', NULL, 'Save',             'Lưu'),
('en', '*', NULL, 'Cancel',           'Cancel'),
('vi', '*', NULL, 'Cancel',           'Hủy'),
('en', '*', NULL, 'View',             'View'),
('vi', '*', NULL, 'View',             'Xem'),
('en', '*', NULL, 'Search',           'Search'),
('vi', '*', NULL, 'Search',           'Tìm kiếm'),
('en', '*', NULL, 'Status',           'Status'),
('vi', '*', NULL, 'Status',           'Trạng thái'),
('en', '*', NULL, 'Actions',          'Actions'),
('vi', '*', NULL, 'Actions',          'Hành động'),
('en', '*', NULL, 'Profile',          'Profile'),
('vi', '*', NULL, 'Profile',          'Hồ sơ'),
('en', '*', NULL, 'Notifications',    'Notifications'),
('vi', '*', NULL, 'Notifications',    'Thông báo'),
('en', '*', NULL, 'Mark all read',    'Mark all read'),
('vi', '*', NULL, 'Mark all read',    'Đánh dấu tất cả đã đọc'),
('en', '*', NULL, 'Loading',          'Loading'),
('vi', '*', NULL, 'Loading',          'Đang tải'),
('en', '*', NULL, 'No data',          'No data'),
('vi', '*', NULL, 'No data',          'Không có dữ liệu'),
('en', '*', NULL, 'Error',            'Error'),
('vi', '*', NULL, 'Error',            'Lỗi'),
('en', '*', NULL, 'Confirm',          'Confirm'),
('vi', '*', NULL, 'Confirm',          'Xác nhận'),
('en', '*', NULL, 'Close',            'Close'),
('vi', '*', NULL, 'Close',            'Đóng'),
('en', '*', NULL, 'Name',             'Name'),
('vi', '*', NULL, 'Name',             'Tên'),
('en', '*', NULL, 'Email',            'Email'),
('vi', '*', NULL, 'Email',            'Email'),
('en', '*', NULL, 'Phone',            'Phone'),
('vi', '*', NULL, 'Phone',            'Điện thoại'),
('en', '*', NULL, 'Date',             'Date'),
('vi', '*', NULL, 'Date',             'Ngày'),
('en', '*', NULL, 'Notes',            'Notes'),
('vi', '*', NULL, 'Notes',            'Ghi chú'),
('en', '*', NULL, 'Total',            'Total'),
('vi', '*', NULL, 'Total',            'Tổng'),
('en', '*', NULL, 'Dashboard',        'Dashboard'),
('vi', '*', NULL, 'Dashboard',        'Bảng điều khiển');

-- Fleet page (page='fleet')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'fleet', NULL, 'Fleet Overview',    'Fleet Overview'),
('vi', 'fleet', NULL, 'Fleet Overview',    'Tổng quan đội xe'),
('en', 'fleet', NULL, 'Add Truck',         'Add Truck'),
('vi', 'fleet', NULL, 'Add Truck',         'Thêm xe'),
('en', 'fleet', NULL, 'Total Trucks',      'Total Trucks'),
('vi', 'fleet', NULL, 'Total Trucks',      'Tổng số xe'),
('en', 'fleet', NULL, 'Service Overdue',   'Service Overdue'),
('vi', 'fleet', NULL, 'Service Overdue',   'Quá hạn bảo dưỡng'),
('en', 'fleet', NULL, 'In Maintenance',    'In Maintenance'),
('vi', 'fleet', NULL, 'In Maintenance',    'Đang bảo dưỡng'),
('en', 'fleet', NULL, 'Plate / Model',     'Plate / Model'),
('vi', 'fleet', NULL, 'Plate / Model',     'Biển số / Mẫu xe'),
('en', 'fleet', NULL, 'Driver',            'Driver'),
('vi', 'fleet', NULL, 'Driver',            'Tài xế'),
('en', 'fleet', NULL, 'Last Service',      'Last Service'),
('vi', 'fleet', NULL, 'Last Service',      'Bảo dưỡng gần nhất'),
('en', 'fleet', NULL, 'Next Service',      'Next Service'),
('vi', 'fleet', NULL, 'Next Service',      'Bảo dưỡng tiếp theo'),
('en', 'fleet', NULL, 'Mileage',           'Mileage'),
('vi', 'fleet', NULL, 'Mileage',           'Số km'),
('en', 'fleet', NULL, 'Truck Type',        'Truck Type'),
('vi', 'fleet', NULL, 'Truck Type',        'Loại xe'),
('en', 'fleet', NULL, 'Branch',            'Branch'),
('vi', 'fleet', NULL, 'Branch',            'Chi nhánh'),
('en', 'fleet', NULL, 'Assign Driver',     'Assign Driver'),
('vi', 'fleet', NULL, 'Assign Driver',     'Phân tài xế'),
('en', 'fleet', NULL, 'Decommission',      'Decommission'),
('vi', 'fleet', NULL, 'Decommission',      'Loại khỏi sử dụng');

-- Drivers page (page='drivers')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'drivers', NULL, 'Drivers Overview',        'Drivers Overview'),
('vi', 'drivers', NULL, 'Drivers Overview',        'Tổng quan tài xế'),
('en', 'drivers', NULL, 'Add Driver',              'Add Driver'),
('vi', 'drivers', NULL, 'Add Driver',              'Thêm tài xế'),
('en', 'drivers', NULL, 'Total Drivers',           'Total Drivers'),
('vi', 'drivers', NULL, 'Total Drivers',           'Tổng số tài xế'),
('en', 'drivers', NULL, 'License Number',          'License Number'),
('vi', 'drivers', NULL, 'License Number',          'Số bằng lái'),
('en', 'drivers', NULL, 'License Expiry',          'License Expiry'),
('vi', 'drivers', NULL, 'License Expiry',          'Ngày hết hạn bằng lái'),
('en', 'drivers', NULL, 'Assigned Truck',          'Assigned Truck'),
('vi', 'drivers', NULL, 'Assigned Truck',          'Xe được phân công'),
('en', 'drivers', NULL, 'Expiring Soon',           'Expiring Soon'),
('vi', 'drivers', NULL, 'Expiring Soon',           'Sắp hết hạn'),
('en', 'drivers', NULL, 'View Trips',              'View Trips'),
('vi', 'drivers', NULL, 'View Trips',              'Xem chuyến xe');

-- Trips page (page='trips')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'trips', NULL, 'Trips Overview',            'Trips Overview'),
('vi', 'trips', NULL, 'Trips Overview',            'Tổng quan chuyến xe'),
('en', 'trips', NULL, 'Add Trip',                  'Add Trip'),
('vi', 'trips', NULL, 'Add Trip',                  'Thêm chuyến xe'),
('en', 'trips', NULL, 'Trip Number',               'Trip Number'),
('vi', 'trips', NULL, 'Trip Number',               'Số chuyến'),
('en', 'trips', NULL, 'Origin',                    'Origin'),
('vi', 'trips', NULL, 'Origin',                    'Điểm xuất phát'),
('en', 'trips', NULL, 'Destination',               'Destination'),
('vi', 'trips', NULL, 'Destination',               'Điểm đến'),
('en', 'trips', NULL, 'Departure',                 'Departure'),
('vi', 'trips', NULL, 'Departure',                 'Khởi hành'),
('en', 'trips', NULL, 'Arrival',                   'Arrival'),
('vi', 'trips', NULL, 'Arrival',                   'Đến nơi'),
('en', 'trips', NULL, 'Distance',                  'Distance'),
('vi', 'trips', NULL, 'Distance',                  'Khoảng cách'),
('en', 'trips', NULL, 'Cargo Type',                'Cargo Type'),
('vi', 'trips', NULL, 'Cargo Type',                'Loại hàng'),
('en', 'trips', NULL, 'Cargo Weight',              'Cargo Weight'),
('vi', 'trips', NULL, 'Cargo Weight',              'Khối lượng hàng'),
('en', 'trips', NULL, 'In Transit Count',          'In Transit'),
('vi', 'trips', NULL, 'In Transit Count',          'Đang vận chuyển');

-- Maintenance page (page='maintenance')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'maintenance', NULL, 'Maintenance Overview',   'Maintenance Overview'),
('vi', 'maintenance', NULL, 'Maintenance Overview',   'Tổng quan bảo dưỡng'),
('en', 'maintenance', NULL, 'Add Service',            'Add Service'),
('vi', 'maintenance', NULL, 'Add Service',            'Thêm lịch bảo dưỡng'),
('en', 'maintenance', NULL, 'Service Type',           'Service Type'),
('vi', 'maintenance', NULL, 'Service Type',           'Loại dịch vụ'),
('en', 'maintenance', NULL, 'Scheduled Date',         'Scheduled Date'),
('vi', 'maintenance', NULL, 'Scheduled Date',         'Ngày lên lịch'),
('en', 'maintenance', NULL, 'Completed Date',         'Completed Date'),
('vi', 'maintenance', NULL, 'Completed Date',         'Ngày hoàn thành'),
('en', 'maintenance', NULL, 'Technician',             'Technician'),
('vi', 'maintenance', NULL, 'Technician',             'Kỹ thuật viên'),
('en', 'maintenance', NULL, 'Cost',                   'Cost'),
('vi', 'maintenance', NULL, 'Cost',                   'Chi phí'),
('en', 'maintenance', NULL, 'Due This Week',          'Due This Week'),
('vi', 'maintenance', NULL, 'Due This Week',          'Đến hạn tuần này'),
('en', 'maintenance', NULL, 'Completed This Month',   'Completed This Month'),
('vi', 'maintenance', NULL, 'Completed This Month',   'Hoàn thành tháng này');

-- Login page (page='login')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'login', NULL, 'Welcome back',              'Welcome back'),
('vi', 'login', NULL, 'Welcome back',              'Chào mừng trở lại'),
('en', 'login', NULL, 'Sign in to your account',  'Sign in to your account'),
('vi', 'login', NULL, 'Sign in to your account',  'Đăng nhập vào tài khoản của bạn'),
('en', 'login', NULL, 'Password',                 'Password'),
('vi', 'login', NULL, 'Password',                 'Mật khẩu'),
('en', 'login', NULL, 'Forgot password?',         'Forgot password?'),
('vi', 'login', NULL, 'Forgot password?',         'Quên mật khẩu?'),
('en', 'login', NULL, 'Signing in...',             'Signing in...'),
('vi', 'login', NULL, 'Signing in...',             'Đang đăng nhập...'),
('en', 'login', NULL, 'Invalid credentials',       'Invalid credentials'),
('vi', 'login', NULL, 'Invalid credentials',       'Thông tin đăng nhập không đúng');

-- Settings page (page='settings')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'settings', NULL, 'System Settings',        'System Settings'),
('vi', 'settings', NULL, 'System Settings',        'Cài đặt hệ thống'),
('en', 'settings', NULL, 'Users & Roles',          'Users & Roles'),
('vi', 'settings', NULL, 'Users & Roles',          'Người dùng & Vai trò'),
('en', 'settings', NULL, 'Branches',               'Branches'),
('vi', 'settings', NULL, 'Branches',               'Chi nhánh'),
('en', 'settings', NULL, 'Translations',           'Translations'),
('vi', 'settings', NULL, 'Translations',           'Bản dịch'),
('en', 'settings', NULL, 'Language',               'Language'),
('vi', 'settings', NULL, 'Language',               'Ngôn ngữ'),
('en', 'settings', NULL, 'Role',                   'Role'),
('vi', 'settings', NULL, 'Role',                   'Vai trò'),
('en', 'settings', NULL, 'Permissions',            'Permissions'),
('vi', 'settings', NULL, 'Permissions',            'Quyền hạn'),
('en', 'settings', NULL, 'Change Password',        'Change Password'),
('vi', 'settings', NULL, 'Change Password',        'Đổi mật khẩu');

-- Reports page (page='reports')
INSERT INTO translations (lang, page, component, text, translated) VALUES
('en', 'reports', NULL, 'Reports Overview',        'Reports Overview'),
('vi', 'reports', NULL, 'Reports Overview',        'Tổng quan báo cáo'),
('en', 'reports', NULL, 'Fleet Utilization',       'Fleet Utilization'),
('vi', 'reports', NULL, 'Fleet Utilization',       'Hiệu suất sử dụng đội xe'),
('en', 'reports', NULL, 'Cost Analysis',           'Cost Analysis'),
('vi', 'reports', NULL, 'Cost Analysis',           'Phân tích chi phí'),
('en', 'reports', NULL, 'Driver Performance',      'Driver Performance'),
('vi', 'reports', NULL, 'Driver Performance',      'Hiệu suất tài xế'),
('en', 'reports', NULL, 'Utilization Rate',        'Utilization Rate'),
('vi', 'reports', NULL, 'Utilization Rate',        'Tỉ lệ sử dụng'),
('en', 'reports', NULL, 'Total Distance',          'Total Distance'),
('vi', 'reports', NULL, 'Total Distance',          'Tổng khoảng cách'),
('en', 'reports', NULL, 'Completion Rate',         'Completion Rate'),
('vi', 'reports', NULL, 'Completion Rate',         'Tỉ lệ hoàn thành'),
('en', 'reports', NULL, 'Export',                  'Export'),
('vi', 'reports', NULL, 'Export',                  'Xuất báo cáo');
