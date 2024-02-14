# Kintone Migrate Project App

This application was developed to extract the Kintone reports and attachments from a specific app and move all the attachments to a specific SharePoint folder structure previously defined.

The Kintone exports the reports as a CSV file, I parse this file to get all the fields I need and later upload the files in the desired structure.

## SETUP

There some ENV variables that needed be configured to allow this applications works like:

- `KINTONE_APP`
  - The kintone ID of the app.
- `KINTONE_TOKEN`
  - The kintone App's API token.
- `KINTONE_APP_QUERY`
  - The query that will specify what records will be returned.
  - Refer to the [Query Operators and Functions](https://kintone.dev/en/docs/kintone/overview/query-string/#query-operators-and-functions) document for the operators and options that can be specified in the query string.
  - If ignored, all accessible records from the app will be returned.
`order by`, `limit`, and `offset` can not be used in the query.
- `MS_GRAPH_CLIENT_ID`
  - The Microsoft APP ClientID used to connect to sharepoint.
- `MS_GRAPH_CLIENT_SECRET`
  - The Microsoft APP ClientSecret used to connect to sharepoint.
- `MS_SHAREPOINT_FOLDER`
  - The Microsoft SharePoint folder path that will be used to export the attachments.
  - If ignored, will be used `me/drive/root` as default

## RUNNING

You can run the command bellow to pull a docker image with this application only need change the env variables like:


    docker run --rm -it --name kintone-migrate-projects -e KINTONE_APP='1' -e KINTONE_TOKEN='querty123' -e MS_GRAPH_CLIENT_ID='123' -e MS_GRAPH_CLIENT_SECRET='querty321' maykoncapellari/kintone-migrate-projects

