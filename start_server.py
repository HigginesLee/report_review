#!/usr/bin/env python3
"""
实验报告评阅系统 - 本地预览服务器
快速启动脚本
"""

import http.server
import socketserver
import webbrowser
import os

PORT = 8080

def main():
    # 切换到脚本所在目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    print("=" * 60)
    print("🎓 实验报告评阅系统 - 本地预览")
    print("=" * 60)
    print(f"\n📂 工作目录: {os.getcwd()}")
    print(f"🌐 服务地址: http://localhost:{PORT}")
    print(f"📄 主页面: http://localhost:{PORT}/review_system.html")
    print("\n💡 提示: 选择 'Hadoop原理与技术' 课程可查看完整的数据分析报告")
    print("\n按 Ctrl+C 停止服务器\n")
    print("=" * 60)
    
    # 启动服务器
    Handler = http.server.SimpleHTTPRequestHandler
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n✅ 服务器已启动，正在打开浏览器...")
        
        # 自动打开浏览器
        try:
            webbrowser.open(f'http://localhost:{PORT}/review_system.html')
        except:
            print("⚠️ 无法自动打开浏览器，请手动访问上述地址")
        
        print(f"🔄 服务器运行中...\n")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\n👋 服务器已停止")
            print("=" * 60)

if __name__ == "__main__":
    main()
