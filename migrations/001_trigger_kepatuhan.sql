CREATE OR REPLACE FUNCTION fn_cek_plafon_tarif()
RETURNS TRIGGER AS $$
DECLARE
  v_plafon_per_km DOUBLE PRECISION;
  v_batas_maks DOUBLE PRECISION;
BEGIN
  SELECT plafon_tarif_per_km INTO v_plafon_per_km
  FROM koridor
  WHERE id = NEW.koridor_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Koridor id % tidak ditemukan', NEW.koridor_id;
  END IF;

  IF NEW.price_mode = 'social' AND NEW.price_per_seat > 0 THEN
    RAISE EXCEPTION 'Perjalanan mode sosial wajib menetapkan tarif Rp0 per kursi';
  END IF;

  v_batas_maks := CEIL(v_plafon_per_km * COALESCE(NEW.jarak_km, 0));

  IF NEW.price_per_seat > v_batas_maks THEN
    RAISE EXCEPTION 'Tarif per kursi melampaui plafon koridor: Rp% > batas maksimum Rp% (jarak % km x plafon Rp%/km)',
      ROUND(NEW.price_per_seat::numeric),
      ROUND(v_batas_maks::numeric),
      ROUND(NEW.jarak_km::numeric, 1),
      ROUND(v_plafon_per_km::numeric);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cek_plafon_tarif ON trips;

CREATE TRIGGER trg_cek_plafon_tarif
BEFORE INSERT OR UPDATE OF price_per_seat, koridor_id, jarak_km, price_mode ON trips
FOR EACH ROW
EXECUTE FUNCTION fn_cek_plafon_tarif();

CREATE OR REPLACE FUNCTION fn_cek_maks_trip_aktif()
RETURNS TRIGGER AS $$
DECLARE
  v_jumlah_aktif INTEGER;
  v_tgl_berangkat DATE;
BEGIN
  IF NEW.status IN ('open', 'in-progress') THEN
    v_tgl_berangkat := (NEW.departure_time AT TIME ZONE 'Asia/Jakarta')::date;

    SELECT COUNT(*) INTO v_jumlah_aktif
    FROM trips
    WHERE driver_id = NEW.driver_id
      AND status IN ('open', 'in-progress')
      AND (departure_time AT TIME ZONE 'Asia/Jakarta')::date = v_tgl_berangkat
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF v_jumlah_aktif >= 2 THEN
      RAISE EXCEPTION 'Pengemudi telah mencapai batas maksimum 2 perjalanan per hari pada tanggal %',
        to_char(v_tgl_berangkat, 'DD-MM-YYYY');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cek_maks_trip_aktif ON trips;

CREATE TRIGGER trg_cek_maks_trip_aktif
BEFORE INSERT OR UPDATE OF status, departure_time ON trips
FOR EACH ROW
EXECUTE FUNCTION fn_cek_maks_trip_aktif();

CREATE OR REPLACE FUNCTION fn_cek_kursi_penuh()
RETURNS TRIGGER AS $$
DECLARE
  v_kapasitas INTEGER;
  v_terpesan INTEGER;
BEGIN
  IF NEW.status IN ('pending', 'confirmed', 'in-progress') THEN
    SELECT available_seats INTO v_kapasitas
    FROM trips
    WHERE id = NEW.trip_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Perjalanan id % tidak ditemukan', NEW.trip_id;
    END IF;

    SELECT COALESCE(SUM(seats_booked), 0) INTO v_terpesan
    FROM bookings
    WHERE trip_id = NEW.trip_id
      AND status IN ('pending', 'confirmed', 'in-progress')
      AND (TG_OP = 'INSERT' OR id <> NEW.id);

    IF (v_terpesan + NEW.seats_booked) > v_kapasitas THEN
      RAISE EXCEPTION 'Kapasitas kursi tidak mencukupi: tersisa % kursi, diminta % kursi',
        (v_kapasitas - v_terpesan),
        NEW.seats_booked;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cek_kursi_penuh ON bookings;

CREATE TRIGGER trg_cek_kursi_penuh
BEFORE INSERT OR UPDATE OF seats_booked, status ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_cek_kursi_penuh();
