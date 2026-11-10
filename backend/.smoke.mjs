import 'dotenv/config'
import pg from 'pg'
import jwt from 'jsonwebtoken'
const base = 'http://localhost:4000'
const db = new pg.Client({ connectionString: process.env.DATABASE_URL }); await db.connect()
const pa = (await db.query(`select id from roles where name='Platform Admin'`)).rows[0].id
await db.query(`insert into users (id,email,password_hash,full_name,user_type,role_id,updated_at) values ('smoke_admin','smoke-admin@example.invalid','x','Smoke Admin','PLATFORM_ADMIN',$1,now())`, [pa])
const t = jwt.sign({ userId: 'smoke_admin', email: 'x', userType: 'PLATFORM_ADMIN', sid: 's' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '5m' })
const req = (m, p, b) => fetch(base + p, { method: m, headers: { 'content-type': 'application/json', authorization: 'Bearer ' + t }, body: b && JSON.stringify(b) }).then(async r => [r.status, await r.json()])
const mk = (slug, email) => req('POST', '/sellers/onboard', {
  business: { legalBusinessName: 'Edit Test Pvt Ltd', businessType: 'LLP', registeredAddress: '5 Lake Road, Chennai', gstNumber: '33ABCDE1234F1Z5', panNumber: 'ABCDE1234F', ownerName: 'Edit Owner', ownerPhone: '+919822222222', ownerEmail: email },
  profile: { name: 'Edit Seller', slug, category: 'fashion', brandColor: '#2E77D0' }, kyc: { mode: 'OFFLINE', offlineReference: 'R-1' } })
try {
  const [, a] = await mk('edit-seller-test', 'edit-owner@example.invalid')
  await mk('edit-seller-other', 'edit-owner2@example.invalid')
  const id = a.data.id
  const gst = async () => (await db.query(`select gst_number, pan_number from seller_business_details where seller_id=$1`, [id])).rows[0]

  let [s, j] = await req('PATCH', `/sellers/${id}`, { business: { ownerName: 'Renamed Owner' } })
  const owner = (await db.query(`select full_name from users where email='edit-owner@example.invalid'`)).rows[0]
  console.log('partial update (owner name only) ->', s, '| GST/PAN kept:', JSON.stringify(await gst()), '| owner account name:', owner.full_name)

  ;[s, j] = await req('PATCH', `/sellers/${id}`, { business: { gstNumber: '', panNumber: 'ABCDE1234F' } })
  console.log('clear GST ->', s, JSON.stringify(await gst()))

  ;[s, j] = await req('PATCH', `/sellers/${id}`, { profile: { name: 'Edit Seller Two', slug: 'edit-seller-new', category: 'grocery', brandColor: '#D0455A' } })
  console.log('profile update ->', s, j.data?.name, j.data?.slug, j.data?.categoryLabel, j.data?.brandColor, '| publicUrl', j.data?.publicUrl)

  ;[s, j] = await req('PATCH', `/sellers/${id}`, { profile: { slug: 'edit-seller-new' } })
  console.log('keep own URL ->', s)
  ;[s, j] = await req('PATCH', `/sellers/${id}`, { profile: { slug: 'edit-seller-other' } })
  console.log('take another seller URL ->', s, j.field, j.message)

  ;[s, j] = await req('PATCH', `/sellers/${id}`, { commissionRate: 9.5 }); console.log('commission as Platform Admin ->', s, j.data?.commissionRate)
  ;[s, j] = await req('PATCH', `/sellers/${id}`, { commissionRate: 80 }); console.log('commission 80% ->', s, j.message)

  const pu = (await db.query(`select id from roles where name='Platform User'`)).rows[0].id
  await db.query(`insert into users (id,email,password_hash,full_name,user_type,role_id,updated_at) values ('smoke_pu','smoke-pu@example.invalid','x','PU','PLATFORM_ADMIN',$1,now())`, [pu])
  const tp = jwt.sign({ userId: 'smoke_pu', email: 'x', userType: 'PLATFORM_ADMIN', sid: 's' }, process.env.JWT_ACCESS_SECRET, { expiresIn: '2m' })
  const r = await fetch(`${base}/sellers/${id}`, { method: 'PATCH', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + tp }, body: JSON.stringify({ business: { ownerName: 'Hacker' } }) })
  console.log('Platform User (view-only) edit ->', r.status, (await r.json()).message)
} finally {
  await db.query(`delete from sellers where slug in ('edit-seller-test','edit-seller-new','edit-seller-other')`)
  await db.query(`delete from users where email like 'edit-owner%@example.invalid' or id in ('smoke_admin','smoke_pu')`)
  await db.end()
}
