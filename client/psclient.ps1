$capcode = $args[0]
$msgbody = $args[1]

$sourcename 	= "***Source name***"
$appurl 	= "***App URL***/api/messages" #www.example.com:3000/api/messages
$apikey 	= "***API Key***"

$datetime = [Math]::Floor([decimal](Get-Date(Get-Date).ToUniversalTime()-uformat "%s"))

$url = $appurl   
   $data = @{
			address=$capcode
			message=$msgbody
			datetime=$datetime 
			source=$sourcename
   }
$json = $data | ConvertTo-Json
$response = Invoke-RestMethod $url -Method post -Body $json -Header @{"apikey"=$apikey} -ContentType 'application/json'

exit
