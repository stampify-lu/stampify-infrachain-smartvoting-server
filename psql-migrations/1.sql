CREATE EXTENSION IF NOT EXISTS plpgsql WITH SCHEMA pg_catalog;

CREATE TABLE public.meeting (
    id bigserial NOT NULL,
    "updatedOn" timestamp with time zone,
    name character varying(200),
    "timeBegin" timestamp with time zone NOT NULL,
    "timeEnd" timestamp with time zone NOT NULL,
    "timeFrozen" timestamp with time zone,
    "contractAddress" character varying(200)
);
CREATE TABLE public.user_ (
    id bigserial NOT NULL,
    "updatedOn" timestamp with time zone,
    "firstName" character varying(200),
    "lastName" character varying(200),
    lang integer DEFAULT 0 NOT NULL,
    "role" integer DEFAULT 0 NOT NULL,
    "accountName" character varying(200),
    "passwordHash" character varying(200),
    "salt" character varying(200),
    "publicAddress" character varying(200),
    "resetKey" character varying(200)
);
CREATE TABLE public.user__meeting (
    id bigserial NOT NULL,
    user__id bigint NOT NULL,
    meeting_id bigint NOT NULL
);



ALTER TABLE ONLY public.meeting
    ADD CONSTRAINT meeting_pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user_
    ADD CONSTRAINT user__pkey PRIMARY KEY (id);
ALTER TABLE ONLY public.user__meeting
    ADD CONSTRAINT user__meeting_pkey PRIMARY KEY (id);



CREATE INDEX meeting_fk1 ON public.meeting USING btree ("name", "timeBegin");
CREATE INDEX meeting_fk2 ON public.meeting USING btree ("timeBegin");
CREATE INDEX meeting_fk3 ON public.meeting USING btree ("timeEnd", "timeFrozen");
CREATE UNIQUE INDEX user__fk1 ON public.user_ USING btree ("accountName");
CREATE INDEX user__meeting_user__id_index ON public.user__meeting USING btree (user__id);
CREATE INDEX user__meeting_meeting_id_index ON public.user__meeting USING btree (meeting_id);
CREATE UNIQUE INDEX user__meeting_u ON public.user__meeting USING btree (meeting_id, user__id);

----
