param(
    [string]$ContainerName = "pv-fusion-postgres",
    [string]$Database = "pv_fusion_local",
    [string]$User = "pvfusion"
)

Write-Host "[1/2] Tables"
docker exec -it $ContainerName psql -U $User -d $Database -c "\dt"

Write-Host ""
Write-Host "[2/2] Flyway history"
docker exec -it $ContainerName psql -U $User -d $Database -c "select version, description, success from flyway_schema_history order by installed_rank;"
