require 'sinatra'
require 'json'
require 'httparty'

# Function to post data to an external URL with detailed logging
def post_to_external_url(url, data, auth_token)
  headers = {
    'Content-Type' => 'application/json',
    'auth-token' => auth_token # Set the auth-token directly in the headers
  }

  puts "URL: #{url}"
  puts "Headers: #{headers}"
  puts "Data: #{data.to_json}"

  response = HTTParty.post(url, body: data.to_json, headers: headers)

  puts "Response Code: #{response.code}"
  puts "Response Body: #{response.body}"

  response
rescue StandardError => e
  puts "Error posting to external URL: #{e.message}"
  raise 'Failed to post data to external URL'
end

# Middleware to log raw request body
before do
  request.body.rewind
  raw_body = request.body.read
  puts "Raw Body: #{raw_body}"
  request.body.rewind
  env['rack.input'] = StringIO.new(raw_body)
end

post '/webhook' do
  request_data = JSON.parse(request.body.read)
  puts "Received: #{request_data.to_json}"

  account_id = request_data['accountId']
  api_key = request_data['apiKey']
  symbol = request_data['symbol']
  action = request_data['action']
  volume = request_data['volume']
  auth_token = request_data['authToken'] # Get the auth-token from the request body

  # Basic validation
  if account_id.nil? || api_key.nil? || symbol.nil? || action.nil? || volume.nil?
    halt 400, 'Missing required fields'
  end

  begin
    url = "https://mt-client-api-v1.london.agiliumtrade.ai/users/current/accounts/#{account_id}/trade?api_key=#{api_key}"

    # Post the close position action to the external URL
    close_position_response = post_to_external_url(url, {
      actionType: 'POSITIONS_CLOSE_SYMBOL',
      symbol: symbol
    }, api_key)

    # Log the response to check for any issues
    puts "Close Position Response: #{close_position_response.body}"

    # Post the new order action to the external URL
    order_response = post_to_external_url(url, {
      actionType: "ORDER_TYPE_#{action}",
      symbol: symbol,
      volume: volume
    }, api_key)

    # Log the response to check for any issues
    puts "Order Response: #{order_response.body}"

    status 200
    'Order executed and posted to external URL'
  rescue StandardError => e
    puts "Error executing actions: #{e.message}"
    status 500
    'Error executing actions'
  end
end

# Start the server
set :port, ENV['PORT'] || 4567
