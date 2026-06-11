CREATE TYPE "public"."refill_status" AS ENUM('requested', 'approved', 'denied');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "rx_refills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prescription_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"status" "refill_status" DEFAULT 'requested' NOT NULL,
	"note" text,
	"decided_by" uuid,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp with time zone
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rx_refills" ADD CONSTRAINT "rx_refills_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "rx_refills" ADD CONSTRAINT "rx_refills_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE restrict ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refill_patient_idx" ON "rx_refills" USING btree ("patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "refill_status_idx" ON "rx_refills" USING btree ("status");