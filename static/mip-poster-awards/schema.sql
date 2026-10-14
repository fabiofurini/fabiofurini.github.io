-- MIP EUROPE 2026: Run in a NEW Supabase project SQL Editor.
-- Disable public signup, invite exactly 8 authorized users, and execute role setup at bottom.
create table public.profiles(id uuid primary key references auth.users(id) on delete cascade,email text unique not null,full_name text not null default '',role text not null default 'judge' check(role in('judge','admin')),panel int check(panel in(1,2)));
create table public.posters(id int primary key,presenter text not null,title text not null,panel int not null check(panel in(1,2)));
create table public.assignments(judge_id uuid not null references public.profiles(id),poster_id int not null references public.posters(id),primary key(judge_id,poster_id));
create table public.settings(id boolean primary key default true check(id=true),voting_open boolean not null default true);
insert into public.settings(id) values(true);
create table public.reviews(judge_id uuid not null references public.profiles(id),poster_id int not null references public.posters(id),c1 smallint not null check(c1 between 1 and 5),c2 smallint not null check(c2 between 1 and 5),c3 smallint not null check(c3 between 1 and 5),c4 smallint not null check(c4 between 1 and 5),c5 smallint not null check(c5 between 1 and 5),notes text not null default '' check(length(notes)<=2000),updated_at timestamptz default now(),primary key(judge_id,poster_id));
create table public.conflicts(judge_id uuid not null references public.profiles(id),poster_id int not null references public.posters(id),reason text not null check(length(reason) between 1 and 1000),status text not null default 'open' check(status in('open','resolved')),primary key(judge_id,poster_id));

create or replace function public.awards_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin')$$;
create or replace function public.awards_open() returns boolean language sql stable security definer set search_path='' as $$select voting_open from public.settings where id=true$$;
revoke all on function public.awards_admin() from public,anon;grant execute on function public.awards_admin() to authenticated;
revoke all on function public.awards_open() from public,anon;grant execute on function public.awards_open() to authenticated;
create or replace function public.awards_new_user() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,email,full_name) values(new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'full_name',split_part(new.email,'@',1))) on conflict do nothing; return new; end$$;
create trigger awards_new_user after insert on auth.users for each row execute function public.awards_new_user();

insert into public.posters values
(1,'Felipe Albuquerque','The Capacitated Mobile p-Median Problem with Dynamic Demand',1),
(2,'Alex Fabián Barrales Araneda','Integrated and Sequential Approaches for Electric Bus Timetabling and Vehicle Scheduling',2),
(3,'Khawar Bashir','A Multi-Train Unloading Planning Problem in Maritime Container Terminals',1),
(4,'Chris Cohadari','Spanning-Tree Branching for LP- and SDP-based Maximum Cut Solvers',2),
(5,'Maurice de Kort','Smallest formulations with applications to the Traveling Salesman Problem',2),
(6,'Federica Donnini','Signed Budget Uncertainty for Robust Mixed-Integer Optimization',1),
(7,'Marouane Felloussi','Generic Branch-Cut-and-Price for Knapsack-Constrained Minsum Scheduling',2),
(8,'Carlo Antonio Maria Gervasi','ADMM-based decomposition and certified global search for nonconvex MINLPs',1),
(9,'Sara Hein','Investigating mixed-integer programming approaches for the p-α-closest-center problem',2),
(10,'Alexander Helber','Optimal Refinement in Dynamic Discretization Discovery for Continuous-Time Service Network Design',1),
(11,'Layth Kashou','Integrated Planning and Scheduling in Reconfigurable Manufacturing Systems: A Deterministic MILP Approach',1),
(12,'Raja Babu Adityan','A Column Generation Approach for Large-Scale Crew Scheduling Problem in Indian Railways',1),
(13,'Simon Stevens','Bilevel Optimization with a Piecewise-Linear Follower',2),
(14,'Gennesaret Kharistio Tjusila','CHAP: A Hybrid GPU-CPU Heuristic for MIP',2),
(15,'Virginia Verna','An LLM-Based Framework for Planner-Authored Heuristics in Mixed Integer Programming',1);
alter table public.profiles enable row level security;
alter table public.posters enable row level security;
alter table public.assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.conflicts enable row level security;
alter table public.settings enable row level security;
create policy p_profiles_sel on public.profiles for select to authenticated using(id=(select auth.uid()) or (select public.awards_admin()));
create policy p_profiles_upd on public.profiles for update to authenticated using((select public.awards_admin())) with check((select public.awards_admin()));
create policy p_posters_sel on public.posters for select to authenticated using((select public.awards_admin()) or exists(select 1 from public.assignments a where a.poster_id=id and a.judge_id=(select auth.uid())));
create policy p_assign_sel on public.assignments for select to authenticated using(judge_id=(select auth.uid()) or (select public.awards_admin()));
create policy p_assign_ins on public.assignments for insert to authenticated with check((select public.awards_admin()) and exists(select 1 from public.profiles p where p.id=judge_id and p.role='judge'));
create policy p_assign_del on public.assignments for delete to authenticated using((select public.awards_admin()));
create policy p_reviews_sel on public.reviews for select to authenticated using(judge_id=(select auth.uid()) or (select public.awards_admin()));
create policy p_reviews_ins on public.reviews for insert to authenticated with check(judge_id=(select auth.uid()) and (select public.awards_open()) and exists(select 1 from public.assignments a where a.judge_id=reviews.judge_id and a.poster_id=reviews.poster_id) and not exists(select 1 from public.conflicts c where c.judge_id=reviews.judge_id and c.poster_id=reviews.poster_id and c.status='open'));
create policy p_reviews_upd on public.reviews for update to authenticated using(judge_id=(select auth.uid()) and (select public.awards_open())) with check(judge_id=(select auth.uid()) and (select public.awards_open()) and exists(select 1 from public.assignments a where a.judge_id=reviews.judge_id and a.poster_id=reviews.poster_id) and not exists(select 1 from public.conflicts c where c.judge_id=reviews.judge_id and c.poster_id=reviews.poster_id and c.status='open'));
create policy p_conflicts_sel on public.conflicts for select to authenticated using(judge_id=(select auth.uid()) or (select public.awards_admin()));
create policy p_conflicts_ins on public.conflicts for insert to authenticated with check(judge_id=(select auth.uid()) and exists(select 1 from public.assignments a where a.judge_id=conflicts.judge_id and a.poster_id=conflicts.poster_id));
create policy p_conflicts_upd on public.conflicts for update to authenticated using(judge_id=(select auth.uid()) or (select public.awards_admin())) with check((select public.awards_admin()) or (judge_id=(select auth.uid()) and status='open'));
create policy p_settings_sel on public.settings for select to authenticated using(true);
create policy p_settings_upd on public.settings for update to authenticated using((select public.awards_admin())) with check((select public.awards_admin()));
create or replace function public.awards_guard_review() returns trigger language plpgsql security definer set search_path='' as $$begin
if not exists(select 1 from public.assignments a where a.poster_id=new.poster_id and a.judge_id=new.judge_id) then raise exception 'Not assigned';end if;
if exists(select 1 from public.conflicts c where c.poster_id=new.poster_id and c.judge_id=new.judge_id and c.status='open') then raise exception 'Conflict of interest';end if;
if not (select voting_open from public.settings where id=true) then raise exception 'Voting closed';end if;new.updated_at=now();return new;end$$;
create trigger awards_guard_review before insert or update on public.reviews for each row execute function public.awards_guard_review();
grant select on public.profiles,public.posters,public.assignments,public.reviews,public.conflicts,public.settings to authenticated;
grant update on public.profiles,public.settings to authenticated;
grant insert,delete on public.assignments to authenticated;
grant insert,update on public.reviews,public.conflicts to authenticated;
revoke all on public.profiles,public.posters,public.assignments,public.reviews,public.conflicts,public.settings from anon;

-- AFTER CREATING AUTH USERS, run (and verify all 8 accounts):
-- update public.profiles set role='admin' where email in ('fabio.furini82@gmail.com','veronica.piccialli@uniroma1.it');
-- update public.profiles set panel=1 where email in ('al748@cornell.edu','petra.mutzel@cs.uni-bonn.de','bghaddar@faculty.ie.edu');
-- update public.profiles set panel=2 where email in ('jonxlee@umich.edu','luebbecke@or.rwth-aachen.de','r.misener@imperial.ac.uk');
-- Use the admin interface to check conflicts and assign the panels.
