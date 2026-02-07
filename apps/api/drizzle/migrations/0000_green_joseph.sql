CREATE TABLE "dramas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"poster_url" text,
	"status" text DEFAULT 'upcoming' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dramas_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "episodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"season_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text,
	"description" text,
	"duration" integer,
	"video_urls" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"drama_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watch_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"episode_id" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"watched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"drama_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_drama_id_dramas_id_fk" FOREIGN KEY ("drama_id") REFERENCES "public"."dramas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watch_history" ADD CONSTRAINT "watch_history_episode_id_episodes_id_fk" FOREIGN KEY ("episode_id") REFERENCES "public"."episodes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "watchlist" ADD CONSTRAINT "watchlist_drama_id_dramas_id_fk" FOREIGN KEY ("drama_id") REFERENCES "public"."dramas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dramas_slug_idx" ON "dramas" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "dramas_status_idx" ON "dramas" USING btree ("status");--> statement-breakpoint
CREATE INDEX "dramas_title_idx" ON "dramas" USING btree ("title");--> statement-breakpoint
CREATE UNIQUE INDEX "episodes_season_number_idx" ON "episodes" USING btree ("season_id","number");--> statement-breakpoint
CREATE INDEX "episodes_season_idx" ON "episodes" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_drama_number_idx" ON "seasons" USING btree ("drama_id","number");--> statement-breakpoint
CREATE INDEX "seasons_drama_idx" ON "seasons" USING btree ("drama_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "watch_history_user_episode_idx" ON "watch_history" USING btree ("user_id","episode_id");--> statement-breakpoint
CREATE INDEX "watch_history_user_watched_at_idx" ON "watch_history" USING btree ("user_id","watched_at");--> statement-breakpoint
CREATE INDEX "watch_history_user_idx" ON "watch_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watch_history_episode_idx" ON "watch_history" USING btree ("episode_id");--> statement-breakpoint
CREATE UNIQUE INDEX "watchlist_user_drama_idx" ON "watchlist" USING btree ("user_id","drama_id");--> statement-breakpoint
CREATE INDEX "watchlist_user_added_at_idx" ON "watchlist" USING btree ("user_id","added_at");--> statement-breakpoint
CREATE INDEX "watchlist_user_idx" ON "watchlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "watchlist_drama_idx" ON "watchlist" USING btree ("drama_id");