<?php
namespace App\Services;
final class BankApi {
 public function __construct(private AuthApi $auth) {}
 public function call(string $method,string $path,array $values=[]): array {
  $response=$this->auth->authorized($method,$path,$values);$this->auth->validateResponse($response);
  return $response->json('data') ?? [];
 }
}
