/**
 * File: fetch.ts of LunZi
 * Author: 阿佑[ayooooo@petalmail.com]
 * Date: 2024/4/7 15:58
 */
import _axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import stateFetch, { StateFetchConfig } from '../stateFetch'

/**
 * 导出 axios 实例 用户可以自行配置
 */
export const axios = _axios

/**
 * 在请求中添加时间戳
 */
axios.interceptors.request.use(config => {
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: Date.now(),
    }
  }
  
  if (config.method === 'post') {
    config.data = {
      ...config.data,
      _t: Date.now(),
    }
  }
  
  return config
})

const { send, cancel: _cancel } = stateFetch()

export const cancel = _cancel

/**
 * 默认的解析器
 * @param resp
 */
function dftParser<T> (resp: AxiosResponse) {
  return resp.data as T
}

/**
 * 接收请求并返回一个函数
 * @param request
 * @param parser
 */
export function receive (
  request: (config: AxiosRequestConfig) => Promise<AxiosResponse>,
  parser: <T>(resp: AxiosResponse<T>) => T = dftParser,
) {
  return <T> (url: string) => {
    return (data?: Record<string, unknown> | null, config?: AxiosRequestConfig & StateFetchConfig) => {
      return send(
        request,
        {
          ...config,
          url,
          data: data ?? {},
        },
      )
        .then(parser<T>)
    }
  }
}

/**
 * axios get 请求
 */
export const get = receive(config => {
  return axios({
    ...config,
    method: 'get',
    params: config.data,
  })
})

/**
 * axios post 请求
 */
export const post = receive(config => {
  return axios({
    ...config,
    method: 'post',
  })
})
