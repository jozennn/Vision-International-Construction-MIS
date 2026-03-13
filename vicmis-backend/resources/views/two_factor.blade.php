<!DOCTYPE html>
<html>
<head>
    <style>
        .email-container {
            font-family: Arial, sans-serif;
            max-width: 600px;
            margin: 0 auto;
            border: 1px solid #e1e1e1;
            border-radius: 8px;
            overflow: hidden;
        }
        .header {
            background-color: #2c3e50;
            color: white;
            padding: 20px;
            text-align: center;
        }
        .body {
            padding: 30px;
            text-align: center;
        }
        .code-box {
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 5px;
            color: #3498db;
            background: #f4f7f6;
            padding: 20px;
            margin: 20px 0;
            border-radius: 5px;
            display: inline-block;
        }
        .footer {
            background-color: #f9f9f9;
            color: #7f8c8d;
            padding: 15px;
            font-size: 12px;
            text-align: center;
        }
    </style>
    
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>Vision International Construction OPC</h1>
        </div>
        <div class="body">
            <h2>Security Verification</h2>
            <p>Hello, please use the following code to complete your login process.</p>
            <div class="code-box">{{ $code }}</div>
            <p><strong>This code will expire in 1 minute.</strong></p>
            <p>If you did not attempt to log in, please secure your account immediately.</p>
        </div>
    </div>
</body>
</html>