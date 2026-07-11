# Cloud Scheduler jobs for the SilkRoad Africa Cloud Run deployment.
#
# The app's cron endpoints (src/app/api/cron/*) authenticate with a
# CRON_SECRET bearer token. On Vercel the schedules came from vercel.json;
# on Cloud Run they must be Cloud Scheduler HTTP jobs instead — vercel.json
# is kept only as documentation of intended schedules.
#
# Prerequisites:
#   - gcloud CLI authenticated against the project running the service
#   - CRON_SECRET set as an env var on the Cloud Run service (see
#     cloudbuild.yaml) and passed here so the header matches
#
# Usage:
#   .\scripts\setup-cloud-scheduler.ps1 -CronSecret "<the CRON_SECRET value>"
#   # optional: -BaseUrl / -Location / -TimeZone overrides

param(
  [Parameter(Mandatory = $true)][string]$CronSecret,
  [string]$BaseUrl = "https://silkroad-africa-798904783325.asia-east1.run.app",
  [string]$Location = "asia-east1",
  # "2am" jobs fire in this zone; change if ops works a different clock
  [string]$TimeZone = "Asia/Taipei"
)

$jobs = @(
  @{ Name = "silkroad-pipeline-processor"; Path = "/api/cron/pipeline-processor";   Schedule = "* * * * *" },
  @{ Name = "silkroad-pipeline-monitor";   Path = "/api/cron/pipeline-monitor";     Schedule = "*/15 * * * *" },
  @{ Name = "silkroad-carrier-tracking";   Path = "/api/cron/carrier-tracking-poll"; Schedule = "*/30 * * * *" },
  @{ Name = "silkroad-exchange-rates";     Path = "/api/cron/exchange-rates";       Schedule = "0 * * * *" },
  @{ Name = "silkroad-expire-quotes";      Path = "/api/cron/expire-quotes";        Schedule = "0 2 * * *" },
  @{ Name = "silkroad-email-sequences";    Path = "/api/cron/email-sequences";      Schedule = "0 2 * * *" }
  # Paused by choice (covered by the on-load pass in /admin/mail):
  #   /api/cron/mail-sync      (*/5)  — re-add here to resume background sync
  #   /api/cron/email-skills   (*/5)  — re-add here to resume background AI runs
)

foreach ($job in $jobs) {
  $uri = "$BaseUrl$($job.Path)"
  Write-Host "Ensuring job $($job.Name) -> $uri  [$($job.Schedule) $TimeZone]"

  gcloud scheduler jobs describe $job.Name --location $Location *> $null
  if ($LASTEXITCODE -eq 0) {
    gcloud scheduler jobs update http $job.Name `
      --location $Location `
      --schedule $job.Schedule `
      --time-zone $TimeZone `
      --uri $uri `
      --http-method GET `
      --update-headers "Authorization=Bearer $CronSecret" `
      --attempt-deadline "540s"
  }
  else {
    gcloud scheduler jobs create http $job.Name `
      --location $Location `
      --schedule $job.Schedule `
      --time-zone $TimeZone `
      --uri $uri `
      --http-method GET `
      --headers "Authorization=Bearer $CronSecret" `
      --attempt-deadline "540s"
  }
}

Write-Host ""
Write-Host "Done. Verify with: gcloud scheduler jobs list --location $Location"
