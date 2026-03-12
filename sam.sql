Table users {
  id varchar [pk]
  name varchar
  email varchar [unique]
  emailVerified datetime
  image varchar

  accessLevel varchar
  logins int
  lastLogin datetime

  institutionId varchar

  createdAt datetime
  updatedAt datetime
}

Table accounts {
  id varchar [pk]
  userId varchar
  type varchar
  provider varchar
  providerAccountId varchar
  refresh_token text
  access_token text
  expires_at int
  token_type varchar
  scope varchar
  id_token text
  session_state varchar
}

Table sessions {
  id varchar [pk]
  sessionToken varchar [unique]
  userId varchar
  expires datetime
}

Table verification_tokens {
  identifier varchar
  token varchar [unique]
  expires datetime
}

Table otp {
  id varchar [pk]
  email varchar
  otp varchar
  createdAt datetime
  expires datetime
}

Table institutions {
  id varchar [pk]
  name varchar
  abbr varchar
  type varchar
  industry varchar
  address varchar
  phone varchar
  email varchar
  website varchar
  status varchar
  createdAt datetime
  updatedAt datetime
}

Table datasets {
  id varchar [pk]
  datasetId varchar [unique]

  name varchar
  description text

  institutionId varchar

  brightfieldBlobUrl text
  fluorescentBlobUrl text
  spacing float

  brightfieldNumZ int
  brightfieldNumY int
  brightfieldNumX int

  fluorescentNumZ int
  fluorescentNumY int
  fluorescentNumX int

  createdAt datetime
  updatedAt datetime
}

Table dataset_users {
  userId varchar
  datasetId varchar
}

Table dataset_mappings {
  id varchar [pk]
  parentId varchar [unique]
  createdAt datetime
  updatedAt datetime
}

Table dataset_child_refs {
  id varchar [pk]

  datasetMappingId varchar
  datasetId varchar

  alias varchar
  order int
}

Table upload_status {
  id varchar [pk]
  uploadId varchar [unique]
  userId varchar
  status varchar
  progress int
  message varchar
  datasetName varchar
  startedAt datetime
  completedAt datetime
  result json
  error text
}

Table annotations {
  id varchar [pk]
  annotationId varchar [unique]

  view varchar
  slice float
  x float
  y float

  text text
  instance int

  userEmail varchar
  datasetId varchar

  status varchar
  studyName varchar

  datetime float
}

Table feedback {
  id varchar [pk]

  userId varchar
  userEmail varchar
  userName varchar

  type varchar
  category varchar
  priority varchar

  title varchar
  description text

  rating int

  status varchar

  adminResponse text
  adminResponseAt datetime

  createdAt datetime
  updatedAt datetime
}

Table studies {
  id varchar [pk]

  name varchar
  description text

  userEmail varchar
  datasetId varchar

  createdAt datetime
  updatedAt datetime
}

Table media_docs {
  id varchar [pk]

  name varchar
  format varchar
  URL text

  chunkSize int
  length int

  userEmail varchar
  uploadDate datetime

  datasetId varchar
}

Table views {
  id varchar [pk]

  name varchar

  coords json
  zoom float
  pan json

  creatorEmail varchar
  datasetId varchar

  loadCount int
  loadStats json

  createdAt datetime
}

Table notifications {
  id varchar [pk]

  userId varchar

  type varchar
  title varchar
  message text
  priority varchar

  read boolean

  metadata json

  timestamp datetime
}

Ref: accounts.userId > users.id
Ref: sessions.userId > users.id

Ref: users.institutionId > institutions.id

Ref: datasets.institutionId > institutions.id

Ref: dataset_users.userId > users.id
Ref: dataset_users.datasetId > datasets.id

Ref: dataset_mappings.parentId > datasets.id

Ref: dataset_child_refs.datasetMappingId > dataset_mappings.id
Ref: dataset_child_refs.datasetId > datasets.id

Ref: annotations.datasetId > datasets.id
Ref: annotations.userEmail > users.email

Ref: feedback.userId > users.id

Ref: studies.datasetId > datasets.id
Ref: studies.userEmail > users.email

Ref: media_docs.datasetId > datasets.id
Ref: media_docs.userEmail > users.email

Ref: views.datasetId > datasets.id
Ref: views.creatorEmail > users.email

Ref: notifications.userId > users.id